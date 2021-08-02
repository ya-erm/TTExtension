// @ts-check
import { calcPriceChange, calcPriceChangePercents, getCurrencyRate, getPreviousDayClosePrice } from "./calculate.js";
import { showConfirm } from "./confirm.js";
import { Fill } from "./fill.js";
import { Portfolio } from "./portfolio.js";
import { Position } from "./position.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";
import getOperationsRepository from "./storage/operationsRepository.js";
import { closeTab, createTab, findTab, findTabPane, openTab } from "./tabs.js";
import { TTApi } from "./TTApi.js";
import { convertToSlug, getMoneyColorClass, mapInstrumentType, printDate, printMoney, printVolume, setClassIf } from "./utils.js";

let selectedPortfolio = localStorage.getItem("selectedPortfolio");

async function main() {
    if (!!TTApi.token) {
        // @ts-ignore
        document.getElementById("token-input").value = TTApi.token;

        await TTApi.getCurrencyRate("USD");

        // Создаём вкладки для каждого портфеля
        TTApi.portfolios.forEach(portfolio => {
            createPortfolioTab(portfolio);
            // Отображаем позиции из памяти для выбранного портфеля
            if (portfolio.id == selectedPortfolio) {
                drawPositions(portfolio);
                openTab(`portfolio-${portfolio.id}`);
                selectPortfolio(portfolio);
            }
        });

        // Запрашиваем список счетов
        const accounts = await TTApi.loadAccounts();
        // Создаём портфель для каждого счёта, если он ещё не существует
        accounts.forEach(account => {
            if (!TTApi.portfolios.find(_ => _.account == account.brokerAccountId)) {
                const title = account.brokerAccountType == "Tinkoff" ? "Основной" : "ИИС";
                const id = account.brokerAccountType == "Tinkoff" ? "main" : "iia";
                const portfolio = new Portfolio(title, id);
                portfolio.account = account.brokerAccountId;
                TTApi.portfolios.push(portfolio);
                TTApi.savePortfolios();

                createPortfolioTab(portfolio);
            }
        });

        // Если нет выбранного портфеля, открываем вкладку первого портфеля
        if (selectedPortfolio == undefined && TTApi.portfolios.length > 0) {
            const portfolio = TTApi.portfolios[0];
            openTab(`portfolio-${portfolio.id}`);
            selectPortfolio(portfolio);
        }

        // Загружаем новые позиции и обновляем таблицу
        loopLoadPortfolio();
    } else {
        // Открываем вкладку настроек    
        openTab("settings");
        // Скрываем кнопку очистки хранилища
        setClassIf(eraseButton, "d-none", true);
    }
}

main();

// #region Positions

/**
 * Выбрать портфель
 * @param {Portfolio} portfolio
 */
function selectPortfolio(portfolio) {
    findTab(`portfolio-${selectedPortfolio}`)?.setAttribute("data-default", "false");
    selectedPortfolio = portfolio.id;
    localStorage.setItem("selectedPortfolio", selectedPortfolio);
    findTab(`portfolio-${portfolio.id}`)?.setAttribute("data-default", "true");
    fillPositionsFilterFields(portfolio);
}

/**
 * Отобразить позиции
 * @param {Portfolio} portfolio
 */
function drawPositions(portfolio) {
    portfolio.positions.forEach(position => {
        addOrUpdatePosition(portfolio, position);
        if (position.figi != "RUB") {
            getPreviousDayClosePrice(position.figi)
                .then(previousDayPrice => {
                    const positionRow = document.getElementById(`portfolio-${portfolio.id}_position-${position.figi}`);
                    /** @type {HTMLElement} */
                    const cellChange = positionRow?.querySelector("td.portfolio-change span");
                    if (cellChange) {
                        position.previousDayPrice = previousDayPrice;
                        drawPriceChange(position, previousDayPrice, portfolio.settings.priceChangeUnit, cellChange);
                    }
                });
        }
    });
    addPositionSummaryRow(portfolio);
    sortPositionsTable(portfolio);
}

/**
 * Отсортировать таблицу позиций
 * @param {Portfolio} portfolio
 */
function sortPositionsTable(portfolio) {
    const positionsComparer = portfolio.getComparer();
    const getRowPosition = (tr) => portfolio.positions.find(item => item.figi == tr.id.split("position-")[1]);
    const rowsComparer = (a, b) => positionsComparer(getRowPosition(a), getRowPosition(b));

    document.querySelectorAll(`#portfolio-${portfolio.id}-table tbody`)
        .forEach(tbody => {
            Array.from(tbody.querySelectorAll('tr:nth-child(n+2)'))
                .sort(rowsComparer)
                .forEach(tr => tbody.appendChild(tr));
        });
}

/**
 * Создать вкладку портфеля
 * @param {Portfolio} portfolio
 */
function createPortfolioTab(portfolio) {
    const tabId = `portfolio-${portfolio.id}`;
    if (findTab(tabId)) {
        console.log(`Failed to create tab. Tab with id ${tabId} already exists`);
        return;
    }
    const { tab, tabPane } = createTab("nav-tab-template", "tab-pane-portfolio-template", portfolio.title, tabId);
    tab.addEventListener("click", () => {
        selectPortfolio(portfolio);
        drawPositions(portfolio);
        loopLoadPortfolio();
    });
    tabPane.querySelector("table").id = `portfolio-${portfolio.id}-table`;

    // Переключатель периода отображения прибыли (за день, за всё время)
    const portfolioAllDaySwitch = tabPane.querySelector(".portfolio-all-day-switch");
    portfolioAllDaySwitch.addEventListener("click", () => changePortfolioAllDay(portfolio));
    portfolioAllDaySwitch.textContent = portfolio.settings.allDayPeriod;

    // Переключатель единицы измерения изменения ожидаемой прибыли (проценты, абсолютное значение)
    const portfolioExpectedUnitSwitch = tabPane.querySelector(".portfolio-expected-unit-switch");
    portfolioExpectedUnitSwitch.addEventListener("click", () => changePortfolioExpectedUnit(portfolio));
    portfolioExpectedUnitSwitch.textContent = (portfolio.settings.expectedUnit == "Percents") ? "%" : "$";

    // Переключатель единицы измерения изменения цены за день (проценты, абсолютное значение)
    const priceChangeUnitSwitch = tabPane.querySelector(".price-change-unit-switch");
    priceChangeUnitSwitch.addEventListener("click", () => changePriceChangeUnit(portfolio));
    priceChangeUnitSwitch.textContent = (portfolio.settings.priceChangeUnit == "Percents") ? "%" : "$";

    addPortfolioSortButtonHandlers(portfolio);
}

// Обработчик события обновления позиции
window.addEventListener("PositionUpdated", (event) => {
    /** @type {{position: Position}} */ // @ts-ignore
    const { position } = event.detail;
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == position.portfolioId);
    addOrUpdatePosition(portfolio, position);
    addPositionSummaryRow(portfolio);
});

// Обработчик события удаления позиции
window.addEventListener("PositionRemoved", function (event) {
    /** @type {{position: Position}} */ // @ts-ignore
    const { position } = event.detail;
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == position.portfolioId);
    document.querySelector(`#portfolio-${portfolio.id}_position-${position.figi}`)?.remove();
    addPositionSummaryRow(portfolio);
});

/**
 * Загрузка портфеля
 */
async function loadPortfolio() {
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == selectedPortfolio);
    if (portfolio != undefined) {
        await portfolio.loadPositions();
        drawPositions(portfolio);
    }
}

/**
 * Циклическая загрузка портфеля 
*/
function loopLoadPortfolio() {
    loadPortfolio();
    if (positionsUpdateTimerId != undefined) {
        clearTimeout(positionsUpdateTimerId)
    }
    positionsUpdateTimerId = setInterval(loadPortfolio, updateIntervalTimeout);
}

/**
 * Добавить или обновить строку позиции
 * @param {Portfolio} portfolio 
 * @param {Position} position 
 */
function addOrUpdatePosition(portfolio, position) {
    const positionRow = document.getElementById(`portfolio-${portfolio.id}_position-${position.figi}`);
    if (portfolio.filterPosition(position)) {
        if (!positionRow) {
            addPositionRow(portfolio, position);
        } else {
            fillPositionRow(portfolio, positionRow, position);
        }
    } else if (positionRow) {
        document.querySelector(`#portfolio-${portfolio.id}_position-${position.figi}`)?.remove();
    }
}

/**
  * Создать новую строку в таблице позиций
  * @param {Portfolio} portfolio
  * @param {Position} position
  */
function addPositionRow(portfolio, position) {
    /** @type {HTMLElement} */ // @ts-ignore
    const positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `portfolio-${portfolio.id}_position-${position.figi}`;
    /** @type {HTMLElement} */
    const cellAsset = positionRow.querySelector("td.portfolio-asset");
    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
        ? position.ticker + ' - ' + position.name
        : position.name;
    cellAsset.querySelector("span").title = cellAsset.querySelector("span").textContent;
    // @ts-ignore
    cellAsset.querySelector(".portfolio-logo").style["backgroundImage"] = `url("https://static.tinkoff.ru/brands/traiding/${position.isin}x160.png")`;

    fillPositionRow(portfolio, positionRow, position);

    const tbody = document.querySelector(`#portfolio-${portfolio.id}-table tbody.positions-${position.instrumentType.toLowerCase()}`);
    if (!tbody.querySelector(".group-row")) {
        /** @type {HTMLElement} */ // @ts-ignore
        const groupRow = document.querySelector('#portfolio-group-row-template').content.firstElementChild.cloneNode(true);
        groupRow.querySelector("td").textContent = mapInstrumentType(position.instrumentType);
        tbody.appendChild(groupRow);
    }
    tbody.appendChild(positionRow);

    positionRow.addEventListener("click", () => onPositionClick(portfolio, position));
}

/**
 * Проверить, совпадают ли рассчитанные по сделкам значения с актуальными
 * @param {Position} position - позиция
 * @returns {Boolean}
 */
function isInaccurateValue(position) {
    const calculatedCountNotEqualActual = position.calculatedCount
        && position.calculatedCount != position.count;
    return position.needCalc || calculatedCountNotEqualActual;
}

/**
  * Заполнить строку в таблице позиций данными
  * @param {Portfolio} portfolio - портфель
  * @param {HTMLElement} positionRow - строка таблицы
  * @param {Position} position - позиция
  */
async function fillPositionRow(portfolio, positionRow, position) {
    if (position.count == 0) {
        if (!positionRow.querySelector(".portfolio-asset-button-remove")) {
            /** @type {HTMLElement} */ // @ts-ignore
            const buttonRemove = document.querySelector("#portfolio-asset-button-remove-template").content.firstElementChild.cloneNode(true);
            buttonRemove.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                onPositionRemoveClick(portfolio, position);
            });
            positionRow.querySelector(".portfolio-asset div").appendChild(buttonRemove);
        }
    } else {
        positionRow.querySelector(".portfolio-asset-button-remove")?.remove();
    }

    const inaccurateValue = isInaccurateValue(position);
    let average = inaccurateValue ? position.average : position.calculatedAverage;
    const count = inaccurateValue ? position.count : position.calculatedCount;
    const expected = inaccurateValue ? position.expected : position.calculatedExpected;

    /** @type {HTMLElement} */
    const cellCount = positionRow.querySelector("td.portfolio-count");
    cellCount.textContent = printVolume(count);
    setClassIf(cellCount, "inaccurate-value-text", position.instrumentType != "Currency" && inaccurateValue);
    if (inaccurateValue) {
        cellCount.title = `Calculated by fills: ${position.calculatedCount}\n` +
            `Actual value: ${position.count}`;
    } else if (cellCount.textContent != `${count}`) {
        cellCount.title = `${count}`;
    } else {
        cellCount.title = "";
    }

    /** @type {HTMLElement} */
    const cellAverage = positionRow.querySelector("td.portfolio-average");
    cellAverage.title = "";
    if (position.count == 0) {
        const fills = await portfolio.fillsRepository.getAllByFigi(position.figi);
        if (fills?.length > 1) {
            const fill = fills[fills.length - 2];
            average = fill.averagePrice;
            const fillDate = fill.date.toString().substring(0, 19).replace(/-/g, "/").replace("T", " ");
            cellAverage.title = `Last trade average price (${fillDate})`;
        }
    }
    cellAverage.textContent = printMoney(average, position.currency);
    setClassIf(cellAverage, "inaccurate-value-text", inaccurateValue || position.count == 0);
    if (inaccurateValue) {
        instrumentsRepository.getOneByFigi(position.figi)
            .then(instrument => {
                const precision = instrument?.minPriceIncrement.toString().length ?? 4 - 2
                cellAverage.title = `Calculated by fills: ${printMoney(position.calculatedAverage, null, false, precision)}\n` +
                    `Actual value: ${printMoney(position.average, null, false, precision)}`;
        });
    } else {
        cellAverage.title = "";
    }

    /** @type {HTMLElement} */
    const cellLast = positionRow.querySelector("td.portfolio-last");
    cellLast.textContent = printMoney(position.lastPrice, position.currency);
    if (!!position.lastPriceUpdated) {
        cellLast.title = "Updated at " + new Date(position.lastPriceUpdated).toTimeString().substring(0, 8);
    }

    const cellCost = positionRow.querySelector("td.portfolio-cost");
    cellCost.textContent = (position.count != 0)
        ? printMoney(position.count * position.lastPrice, position.currency)
        : "";
    setClassIf(cellCost, "inaccurate-value-text", position.instrumentType != "Currency" && inaccurateValue);

    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    if (position.count != 0) {
        if (portfolio.settings.expectedUnit == "Percents") {
            const expectedPercents = 100 * expected / (count * position.lastPrice);
            cellExpected.textContent = printMoney(expectedPercents, "%", true);
        } else {
            cellExpected.textContent = printMoney(expected, position.currency, true);
        }
        cellExpected.className = getMoneyColorClass(expected);
        setClassIf(cellExpected, "inaccurate-value-text", position.instrumentType != "Currency" && inaccurateValue);
    } else {
        cellExpected.textContent = "";
    }

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    if (portfolio.settings.allDayPeriod == "All") {
        cellFixedPnL.textContent = printMoney(position.fixedPnL, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(position.fixedPnL);
    } else {
        const fixedPnLToday = await getTodayFixedPnL(portfolio, position);
        cellFixedPnL.textContent = printMoney(fixedPnLToday, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(fixedPnLToday);
    }
}

/**
 * Рассчитать зафиксированную прибыль за торговый день
 * @param {Portfolio} portfolio
 * @param {Position} position
 */
async function getTodayFixedPnL(portfolio, position) {
    const now = new Date();
    const fills = await portfolio.fillsRepository.getAllByFigi(position.figi);
    const fillsToday = fills.filter(fill => {
        if (fill.fixedPnL == undefined) { return false; }
        const fillDate = new Date(fill.date);
        if (now.getUTCHours() < 7) { // 7 UTC = 10 MSK
            return fillDate > new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 7));
        } else {
            return fillDate > new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7));
        }
    });
    const fixedPnLToday = fillsToday.reduce((sum, fill) => sum + fill.fixedPnL, 0);
    return fixedPnLToday != 0 ? fixedPnLToday : undefined;
}

/**
 * Добавить итоговую строку по позициям
 * @param {Portfolio} portfolio
 */
function addPositionSummaryRow(portfolio) {
    let positionRow = document.getElementById(`portfolio-${portfolio.id}_position-summary`);
    if (positionRow) { positionRow.remove(); }
    /** @type {HTMLElement} */ //@ts-ignore
    positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `portfolio-${portfolio.id}_position-summary`;

    setClassIf(positionRow, "cursor-pointer", false);

    const excludeCurrenciesFromTotal = JSON.parse(localStorage["excludeCurrenciesFromTotal"] || "false");

    // total - объект вида
    /** {
        cost: { // текущая стоимость портфеля, сгруппированная по валютам (USB, EUR, RUB, ...)
            USD: Number,
            RUB: Number
        },
        expected: { // ожидаемая прибыль, сгруппированная по валютам (USB, EUR, RUB, ...)
            USD: Number,
            RUB: Number
        },
        fixedPnL: { // зафиксированная прибыль, сгруппированная по валютам (USB, EUR, RUB, ...)
            USD: Number,
            RUB: Number
        }
    } */
    const total = portfolio.positions.reduce((result, position) => {
        const inaccurateValue = isInaccurateValue(position);
        const count = inaccurateValue ? position.count : position.calculatedCount;
        const average = inaccurateValue ? position.average : position.calculatedAverage;
        const expected = inaccurateValue ? position.expected : position.calculatedExpected;
        result.cost[position.currency] |= 0;
        result.expected[position.currency] |= 0;
        result.fixedPnL[position.currency] |= 0;
        result.cost[position.currency] += (count || 0) * (average || 0) + (expected || 0);
        if (!excludeCurrenciesFromTotal || position.instrumentType != "Currency") {
            // Не учитываем валюты в total.expected и total.fixedPnl если активен параметр настроек excludeCurrenciesFromTotal
            result.expected[position.currency] += (expected || 0);
            const fixedPnL = (portfolio.settings.allDayPeriod == "All") ? position.fixedPnL : getTodayFixedPnL(portfolio, position);
            result.fixedPnL[position.currency] += (fixedPnL || 0);
        }
        return result;
    }, { cost: {}, expected: {}, fixedPnL: {} });

    const selectedCurrency = localStorage["selectedCurrency"] || "RUB";

    let totalCostTitle = "Portfolio cost now \n";
    const totalCost = Object.keys(total.expected).reduce((result, key) => {
        totalCostTitle += `${key}: ${printMoney(total.cost[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.cost[key];
    }, 0);
    totalCostTitle = totalCostTitle.trimEnd();

    let totalExpectedTitle = "Total expected \n";
    const totalExpected = Object.keys(total.expected).reduce((result, key) => {
        totalExpectedTitle += `${key}: ${printMoney(total.expected[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.expected[key];
    }, 0);
    totalExpectedTitle = totalExpectedTitle.trimEnd();

    let totalFixedPnLTitle = (portfolio.settings.allDayPeriod == "All") ? "Total fixed P&L \n" : "Fixed P&L today \n";
    const totalFixedPnL = Object.keys(total.fixedPnL).reduce((result, key) => {
        totalFixedPnLTitle += `${key}: ${printMoney(total.fixedPnL[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.fixedPnL[key];
    }, 0);

    const cellCost = positionRow.querySelector("td.portfolio-cost");
    cellCost.textContent = "Total:"

    /** @type {HTMLElement} */
    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    cellExpected.textContent = printMoney(totalExpected, selectedCurrency, true);
    cellExpected.className = getMoneyColorClass(totalExpected);
    cellExpected.title = totalExpectedTitle;
    cellExpected.addEventListener('click', _ => changeSelectedCurrency(portfolio, selectedCurrency));
    setClassIf(cellExpected, "cursor-pointer", true);

    /** @type {HTMLElement} */
    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    cellFixedPnL.textContent = printMoney(totalFixedPnL, selectedCurrency, true);
    cellFixedPnL.className = getMoneyColorClass(totalFixedPnL);
    cellFixedPnL.title = totalFixedPnLTitle;
    cellFixedPnL.addEventListener('click', _ => changeSelectedCurrency(portfolio, selectedCurrency));
    setClassIf(cellFixedPnL, "cursor-pointer", true);

    const assetCell = positionRow.querySelector("td.portfolio-asset");
    assetCell.innerHTML = '<a href="#" class="btn-link">Operations</a>';
    assetCell.addEventListener("click", onOperationsLinkClick);

    const tfoot = document.querySelector(`#portfolio-${portfolio.id}-table tfoot.positions-summary-row`);
    tfoot.appendChild(positionRow);

    const totalCostSpanPrev = document.querySelector(".portfolio-total-cost");
    /** @type {HTMLElement} */ //@ts-ignore
    const totalCostSpan = totalCostSpanPrev.cloneNode(true);
    totalCostSpanPrev.parentNode.replaceChild(totalCostSpan, totalCostSpanPrev);
    const oldTotalCost = parseFloat(totalCostSpan.innerHTML.replace(/ /g, ''));
    totalCostSpan.innerHTML = printMoney(totalCost, selectedCurrency);
    totalCostSpan.title = totalCostTitle;
    totalCostSpan.addEventListener('click', _ => changeSelectedCurrency(portfolio, selectedCurrency));

    if (oldTotalCost && Math.abs(totalCost - oldTotalCost) > 0.01) {
        console.log('Portfolio changed:', 'oldTotalCost', oldTotalCost, 'totalCost', parseFloat(totalCost.toFixed(2)));
        const totalCostChange = totalCost - oldTotalCost;
        const totalCostChangeSpan = document.querySelector(".portfolio-total-cost-change");
        totalCostChangeSpan.innerHTML = printMoney(totalCostChange, selectedCurrency, true);
        setClassIf(totalCostChangeSpan, "text-danger", totalCostChange < 0);
        setClassIf(totalCostChangeSpan, "animation-down", totalCostChange < 0);
        setClassIf(totalCostChangeSpan, "text-success", totalCostChange > 0);
        setClassIf(totalCostChangeSpan, "animation-up", totalCostChange > 0);
    }
}

/**
 * Изменить выбранную для отображения итоговой суммы валюту
 * @param {Portfolio} portfolio
 * @param {string} selectedCurrency 
 */
function changeSelectedCurrency(portfolio, selectedCurrency) {
    if (selectedCurrency == "RUB") {
        selectedCurrency = "USD";
    } else {
        selectedCurrency = "RUB";
    }
    localStorage.setItem("selectedCurrency", selectedCurrency);
    addPositionSummaryRow(portfolio);
};

/**
 * Обработчик нажатия на строку в таблице позиций
 * @param {Portfolio} portfolio
 * @param {Position} position
 */
function onPositionClick(portfolio, position) {
    if (position.figi == "RUB") { return; }
    const ticker = position.ticker;
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(ticker)}`;
    // Если вкладка не существует
    if (!findTab(tabId)) {
        // Создаём и добавляем вкладку
        const { tab, tabPane } = createTab("nav-tab-closable-template", "tab-pane-fills-template", ticker, tabId);

        tab.querySelector(".tab-close-button").addEventListener('click', () => closeTab(tabId));

        // Отображаем сделки из памяти
        portfolio.fillsRepository.getAllByFigi(position.figi)
            .then((fills) => drawOperations(portfolio, position, fills));

        // Загружаем новые сделки и обновляем таблицу
        portfolio.loadFillsByTicker(position.ticker)
            .then((fills) => drawOperations(portfolio, position, fills));

        // Загружаем активные заявки
        portfolio.loadOrdersByTicker(position.ticker)
            .then((orders) => {
                position.orders = orders;
                drawOrders(portfolio, position);
            });

        // Отображаем панель торговли
        drawTradingPanel(portfolio, position);
    }
    // Открываем вкладку
    openTab(tabId);
}

/**
 * Обработчик нажатия на ссылку операций
 */
function onOperationsLinkClick() {
    const portfolio = TTApi.portfolios.find(item => item.id == selectedPortfolio);
    const tabId = `portfolio-${portfolio.id}_operations`;
    // Если вкладка не существует
    if (!findTab(tabId)) {
        // Создаём и добавляем вкладку
        const { tab, tabPane } = createTab("nav-tab-closable-template", "tab-pane-money-template", "Operations", tabId);
        tab.querySelector(".tab-close-button").addEventListener('click', () => closeTab(tabId));
        const loadingSpinner = tabPane.querySelector(".loading-container");
        setClassIf(loadingSpinner, "d-none", false);

        const filterOperationsButton = document.querySelector('button[data-target="#filter-operations-modal"]');
        setClassIf(filterOperationsButton, "text-primary", operationsFilter.length != defaultOperationsFilter.length);

        // Отображаем операции из памяти
        getOperationsRepository(portfolio.account).getAllByTypes(operationsFilter)
            .then(operations => {
                drawSystemOperations(portfolio, operations);
            });

        // Загружаем новые операции и отображаем их
        portfolio.loadOperations()
            .then((operations) => {
                drawSystemOperations(portfolio, operations);
                setClassIf(loadingSpinner, "d-none", true);
            });
    }
    // Открываем вкладку
    openTab(tabId);
}

/**
 * Обработчик нажатия на кнопку удаления позиции
 * @param {Portfolio} portfolio
 * @param {Position} position
 */
function onPositionRemoveClick(portfolio, position) {
    portfolio.removePosition(position);
}

/**
 * Отрисовка изменения цены актива
 * @param {Position} position позиция
 * @param {number} previousDayPrice цена актива за предыдущий день
 * @param {string} priceChangeUnit единица измерения: "Percents" или "Currency"
 * @param {HTMLElement} cellChange HTML элемент, в котором нужно отрисовать изменение цены
 */
function drawPriceChange(position, previousDayPrice, priceChangeUnit, cellChange) {
    if (!cellChange) { return; }
    let change = priceChangeUnit == "Percents"
        ? calcPriceChangePercents(previousDayPrice, position.lastPrice)
        : calcPriceChange(previousDayPrice, position.lastPrice);
    const unit = priceChangeUnit == "Percents" ? "%" : position.currency;
    cellChange.title = `Previous trading day close price: ${printMoney(previousDayPrice, position.currency)}`;
    cellChange.textContent = printMoney(change, unit, true);
    cellChange.className = getMoneyColorClass(change);
}

/**
 * Добавить обработчики сортировки портфеля
 * @param {Portfolio} portfolio
 */
function addPortfolioSortButtonHandlers(portfolio) {
    const table = document.getElementById(`portfolio-${portfolio.id}-table`);
    const sortButtons = table.querySelectorAll("thead .sort-positions-button");
    /** @type {(button: Element) => HTMLElement} */
    const getSortButtonIcon = (button) => button.querySelector("i");
    sortButtons.forEach(sortButton => {
        // @ts-ignore
        const field = sortButton.dataset.value;
        const sortButtonIcon = getSortButtonIcon(sortButton);
        setClassIf(sortButtonIcon, 'd-none', portfolio.settings.sorting.field != field);
        sortButton.addEventListener('click', () => {
            sortButtons.forEach(button => setClassIf(getSortButtonIcon(button), 'd-none', true));
            if (portfolio.settings.sorting.field == field && portfolio.settings.sorting.ascending) {
                portfolio.settings.sorting.ascending = false;
                setClassIf(sortButtonIcon, 'd-none', false);
            } else if (portfolio.settings.sorting.field == field && !portfolio.settings.sorting.ascending) {
                portfolio.settings.sorting.field = undefined;
                portfolio.settings.sorting.ascending = true;
            } else {
                portfolio.settings.sorting.field = field;
                setClassIf(sortButtonIcon, 'd-none', false);
            }
            sortButtonIcon.textContent = portfolio.settings.sorting.ascending ? "↓" : "↑";
            sortPositionsTable(portfolio);
            TTApi.savePortfolios();
        })
    })
}

// #endregion

// #region Operations

/**
 * Отрисовка сделок по активу
 * @param {Portfolio} portfolio
 * @param {Position} position
 * @param {Array<Fill>} fills 
 */
function drawOperations(portfolio, position, fills) {
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(position.ticker)}`;
    const tbody = document.querySelector(`#${tabId} table.table-fills tbody.fills`)
    tbody.innerHTML = "";

    fills.forEach((item, index) => {
        /** @type {HTMLElement} */ //@ts-ignore
        const fillRow = document.querySelector("#fills-row-template").content.firstElementChild.cloneNode(true);

        const cellIndex = fillRow.querySelector("td.fills-index");
        cellIndex.textContent = `${index + 1}`;

        /** @type {HTMLElement} */
        const cellTime = fillRow.querySelector("td.fills-time");
        cellTime.textContent = printDate(Fill.getLastTradeDate(item)) ?? printDate(item.date);
        cellTime.title = "Created: " + printDate(item.date) + ",\n" + "Executed: " + printDate(Fill.getLastTradeDate(item));
        setClassIf(cellTime, "inaccurate-value-text", !!!Fill.getLastTradeDate(item))

        const cellType = fillRow.querySelector("td.fills-type span");
        cellType.textContent = item.operationType == "BuyCard" ? "Buy" : item.operationType;
        cellType.className = item.operationType === "Sell" ? "text-danger" : "text-success";

        const cellPrice = fillRow.querySelector("td.fills-price");
        cellPrice.textContent = item.price.toFixed(2);

        const cellCount = fillRow.querySelector("td.fills-count");
        cellCount.textContent = (-Math.sign(item.payment) == -1 ? "-" : "+")
            + (item.quantityExecuted ?? item.quantity);

        const cellPayment = fillRow.querySelector("td.fills-payment");
        cellPayment.textContent = item.payment.toFixed(2);

        const cellFee = fillRow.querySelector("td.fills-fee");
        cellFee.textContent = item.commission?.toFixed(2);

        const cellCurrent = fillRow.querySelector("td.fills-current");
        cellCurrent.textContent = item.currentQuantity.toString();

        const cellAverage = fillRow.querySelector("td.fills-average");
        cellAverage.textContent = item.averagePrice?.toFixed(2) || " — ";

        if (item.averagePrice) {
            const cellPosition = fillRow.querySelector("td.fills-position");
            cellPosition.textContent = (item.currentQuantity * item.averagePrice)?.toFixed(2);
        }

        const cellFixedPnL = fillRow.querySelector("td.fills-fixed-pnl span");
        cellFixedPnL.textContent = item.fixedPnL?.toFixed(2);
        cellFixedPnL.className = item.fixedPnL < 0 ? "text-danger" : "text-success";

        tbody.prepend(fillRow);
    });

    /** @type {HTMLElement} */ //@ts-ignore
    const fillRow = document.querySelector("#fills-row-template").content.firstElementChild.cloneNode(true);

    /** @type {HTMLElement} */
    const cellFee = fillRow.querySelector("td.fills-fee");
    cellFee.textContent = fills.reduce((res, fill) => res + (fill.commission ?? 0), 0.0)?.toFixed(2);
    cellFee.title = "Total commission";

    /** @type {HTMLElement} */
    const cellFixedPnL = fillRow.querySelector("td.fills-fixed-pnl span");
    cellFixedPnL.textContent = position.fixedPnL?.toFixed(2);
    cellFixedPnL.className = position.fixedPnL < 0 ? "text-danger" : "text-success";
    cellFixedPnL.title = "Total fixed P&L";

    tbody.prepend(fillRow);
}

/**
 * Отрисовка прочих операций
 * @param {Portfolio} portfolio
 * @param {import("./storage/operationsRepository.js").Operation[]} operations
 */
async function drawSystemOperations(portfolio, operations) {
    const tabId = `portfolio-${portfolio.id}_operations`;
    const filteredOperations = operations
        .filter(item => !["Buy", "BuyCard", "Sell"].includes(item.operationType))
        .filter(item => operationsFilter.includes(item.operationType));

    const distinct = (value, index, self) => self.indexOf(value) === index;
    const positions = await Promise.all(filteredOperations
        .map(item => item.figi)
        .filter(distinct)
        .filter(item => item != undefined)
        .map(async (figi) => await portfolio.findPosition(figi)));


    let total = {}; // Сумма, сгруппированная по каждому типу и валюте

    const applyStyleByType = (cell, operationType) => {
        switch (operationType) {
            case "BrokerCommission":
            case "MarginCommission":
            case "ServiceCommission":
            case "TaxDividend":
            case "Tax":
                cell.className = "text-danger";
                break;

            case "Dividend":
            case "Coupon":
            case "PayIn":
                cell.className = "text-success";
                break;

            case "PayOut":
                cell.className = "text-warning";
                break;
        }
    }

    const tbody = document.querySelector(`#${tabId} table tbody.money-detailed`);
    tbody.innerHTML = "";

    filteredOperations
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((item, index) => {

            /** @type {HTMLElement} */ //@ts-ignore
            const fillRow = document.querySelector("#money-row-template").content.firstElementChild.cloneNode(true);

            const cellIndex = fillRow.querySelector("td.money-index");
            cellIndex.textContent = `${index + 1}`;

            /** @type {HTMLElement} */
            const cellTime = fillRow.querySelector("td.money-time");
            cellTime.textContent = item.date.substring(0, 19).replace(/-/g, "/").replace("T", " ");
            cellTime.title = new Date(item.date).toString().split(" (")[0];

            const cellPayment = fillRow.querySelector("td.money-payment");
            cellPayment.textContent = printMoney(item.payment, item.currency);

            const cellType = fillRow.querySelector("td.money-type span");
            cellType.textContent = item.operationType;
            applyStyleByType(cellType, item.operationType);

            /** @type {HTMLElement} */
            const cellAsset = fillRow.querySelector("td.portfolio-asset");
            if (["Dividend", "Coupon", "TaxDividend", "BrokerCommission"].includes(item.operationType)) {
                const position = positions.find(position => position.figi == item.figi);
                if (position != undefined) {
                    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
                    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
                    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
                        ? position.ticker + ' - ' + position.name
                        : position.name;
                    //@ts-ignore
                    cellAsset.querySelector(".portfolio-logo").style["backgroundImage"] = `url("https://static.tinkoff.ru/brands/traiding/${position.isin}x160.png")`;
                }
                else {
                    cellAsset.textContent = item.figi;
                    cellAsset.title = "Failed to find instrument";
                }
            }
            else {
                cellAsset.textContent = "";
            }

            // Подсчитываем сумму
            if (total[item.operationType] == undefined) {
                total[item.operationType] = {};
            }
            if (total[item.operationType][item.currency] == undefined) {
                total[item.operationType][item.currency] = 0;
            }
            total[item.operationType][item.currency] = total[item.operationType][item.currency] + item.payment;

            // Добавляем строку
            tbody.prepend(fillRow);
        });

    const tbodySummary = document.querySelector(`#${tabId} table tbody.money-summary`);
    tbodySummary.innerHTML = "";

    const selectedCurrency = localStorage["selectedCurrency"] || "RUB";

    Object.keys(total)
        //.filter(key => ["MarginCommission", "ServiceCommission", "Dividend", "Coupon"].includes(key))
        .sort((a, b) => operationTypes.indexOf(a) - operationTypes.indexOf(b))
        .forEach(key => {
            const group = total[key];
            let totalValue = 0;
            let totalValueTitle = `Total ${key} \n`;

            // Конвертируем из других валют в выбранную
            Object.keys(group).forEach(currency => {
                totalValue += group[currency] * getCurrencyRate(currency, selectedCurrency)
                totalValueTitle += `${currency}: ${printMoney(group[currency], currency)}\n`;
            });

            /** @type {HTMLElement} */ //@ts-ignore
            const fillRow = document.querySelector("#money-row-template").content.firstElementChild.cloneNode(true);

            const cellPayment = fillRow.querySelector("td.money-payment");
            cellPayment.textContent = printMoney(totalValue, selectedCurrency);

            /** @type {HTMLElement} */
            const cellType = fillRow.querySelector("td.money-type span");
            cellType.textContent = key;
            applyStyleByType(cellType, key);
            cellType.title = totalValueTitle;
            cellType.classList.add("cursor-help");

            const cellAsset = fillRow.querySelector("td.portfolio-asset");
            cellAsset.textContent = "";

            tbodySummary.append(fillRow);
        });
}

/**
 * Отрисовка заявок по активу
 * @param {Portfolio} portfolio
 * @param {Position} position
 */
function drawOrders(portfolio, position) {
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(position.ticker)}`;
    const tbody = document.querySelector(`#${tabId} table.table-fills tbody.orders`)
    tbody.innerHTML = "";

    const orders = position.orders.sort((a, b) => b.price - a.price);
    orders.forEach(item => {
        /** @type {HTMLElement} */ //@ts-ignore
        const orderRow = document.querySelector("#fills-row-template").content.firstElementChild.cloneNode(true);

        /** @type {HTMLElement} */ //@ts-ignore
        const deleteButton = document.querySelector("#order-cancel-button-template").content.firstElementChild.cloneNode(true);

        deleteButton.addEventListener("click", async () => {
            try {
                await TTApi.cancelOrder(item.orderId, portfolio.account);
                tbody.removeChild(orderRow);
            } catch (e) {
                console.error(`Не удалось отменить заявку #${item.orderId}`);
            }
        });

        const cellIndex = orderRow.querySelector("td.fills-index");
        cellIndex.classList.add("d-flex", "align-items-center", "justify-content-center");
        cellIndex.appendChild(deleteButton);

        const cellTime = orderRow.querySelector("td.fills-time");
        cellTime.textContent = `${item.type} order`;

        const cellType = orderRow.querySelector("td.fills-type span");
        cellType.textContent = item.operation;
        cellType.className = item.operation === "Sell" ? "text-danger" : "text-success";

        const cellPrice = orderRow.querySelector("td.fills-price");
        cellPrice.textContent = item.price.toFixed(2);

        const cellCount = orderRow.querySelector("td.fills-count");
        cellCount.textContent = (item.operation === "Sell" ? "-" : "+") + (item.requestedLots);

        const cellPayment = orderRow.querySelector("td.fills-payment");
        cellPayment.textContent = (item.price * item.requestedLots).toFixed(2);

        tbody.append(orderRow);
    });
}

/**
 * Отрисовать панель для торговли
 * @param {Portfolio} portfolio 
 * @param {Position} position 
 */
async function drawTradingPanel(portfolio, position) {
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(position.ticker)}`;
    const tradingPanel = document.querySelector(`#${tabId} .trading-panel`);
    const priceSpan = tradingPanel.querySelector(".trading-price");

    /** @type {HTMLFormElement} */
    const formPlaceOrder = tradingPanel.querySelector(".trading-place-order form");
    /** @type {HTMLInputElement} */
    const inputPrice = tradingPanel.querySelector(".trading-place-order-price");
    /** @type {HTMLInputElement} */
    const inputLots = tradingPanel.querySelector(".trading-place-order-lots");
    /** @type {HTMLElement} */
    const spanCost = tradingPanel.querySelector(".trading-place-order-cost");

    let pricePrecision = 2;
    const instrument = await instrumentsRepository.getOneByFigi(position.figi)
    if (instrument?.minPriceIncrement) {
        inputPrice.setAttribute("step", instrument.minPriceIncrement.toString());
        pricePrecision = instrument.minPriceIncrement.toString().length - 2;
        if (pricePrecision < 2) { pricePrecision = 2; }
    }

    priceSpan.textContent = printMoney(position.lastPrice, position.currency, false, pricePrecision);
    getPreviousDayClosePrice(position.figi)
        .then(previousDayPrice => {
            /** @type {HTMLElement} */
            const spanPriceChange = tradingPanel.querySelector(".trading-price-change span");
            drawPriceChange(position, previousDayPrice, "Currency", spanPriceChange);
            /** @type {HTMLElement} */
            const spanPriceChangePercents = tradingPanel.querySelector(".trading-price-change-percents span");
            drawPriceChange(position, previousDayPrice, "Percents", spanPriceChangePercents);
        });

    const drawCost = () => {
        spanCost.textContent = printMoney(parseFloat(inputPrice.value) * parseInt(inputLots.value), position.currency);
    };
    ["keyup", "change", "paste"].forEach(eventName => {
        inputPrice.addEventListener(eventName, drawCost);
        inputLots.addEventListener(eventName, drawCost);
    });
    priceSpan.addEventListener("click", () => {
        inputPrice.value = position.lastPrice.toFixed(pricePrecision);
        drawCost();
    });

    formPlaceOrder.addEventListener("submit", async (e) => {
        e.preventDefault();
        const order = {
            lots: parseInt(inputLots.value),
            //@ts-ignore
            operation: e.submitter.dataset.value,
            price: parseFloat(inputPrice.value),
        };

        showConfirm(
            `Confirm to ${order.operation.toLowerCase()} ${position.ticker}?`,
            `Price: ${printMoney(order.price, instrument.currency)}\r\n`
            + `Lots: ${order.lots}\r\n`
            + `Cost: ${printMoney(order.price * order.lots, instrument.currency)}`,
            async () => {
                const item = await TTApi.placeLimitOrder(position.figi, order, portfolio.account);
                position.orders.push(item);
                drawOrders(portfolio, position);
            }
        );
    });
}

// #endregion

// #region Settings

/** @type {HTMLInputElement} */
const webTerminalCheckbox = document.querySelector("#webTerminalCheckbox");
webTerminalCheckbox.checked = (localStorage["overrideAveragePriceOnWebTerminal"] === "true");
webTerminalCheckbox.addEventListener("change", (e) => {
    //@ts-ignore
    localStorage["overrideAveragePriceOnWebTerminal"] = e.target.checked;
});

let updateIntervalTimeout = localStorage["positionsUpdateIntervalInput"] || 60 * 1000;
let positionsUpdateTimerId;

/** @type {HTMLInputElement} */
const updateIntervalInput = document.querySelector("#updateIntervalInput");
updateIntervalInput.value = `${updateIntervalTimeout / 1000}`;
updateIntervalInput.addEventListener("change", (e) => {
    //@ts-ignore
    updateIntervalTimeout = e.target.value * 1000;
    localStorage["positionsUpdateIntervalInput"] = updateIntervalTimeout;
    console.log(`Positions update interval changed. New value: ${updateIntervalTimeout} ms`)
    loopLoadPortfolio();
});

const eraseButton = document.getElementById("erase-button");
eraseButton.addEventListener("click", () => {
    // Очищаем хранилище и страницу
    localStorage.clear();
    //@ts-ignore
    document.getElementById("token-input").value = "";
    //@ts-ignore
    $("#portfolio-table tbody").children().remove();
    //@ts-ignore
    $(".nav-item[data-closable='true']").remove();
    document.querySelectorAll(".nav-item")
        .forEach(item => {
            if (!item.querySelector("#settings-tab")) {
                item.remove();
            }
        });
    document.querySelector(".portfolio-total-cost").innerHTML = "";
    getOperationsRepository("").dropDatabase();
    instrumentsRepository.dropDatabase();
    TTApi.eraseData();
    // Скрываем кнопку очистки хранилища
    setClassIf(eraseButton, "d-none", true);
});

/**
 * Изменить период отображаемой прибыли: за всё время или за торговый день
 * @param {Portfolio} portfolio
 */
function changePortfolioAllDay(portfolio) {
    portfolio.settings.allDayPeriod = (portfolio.settings.allDayPeriod == "All") ? "Day" : "All";
    const portfolioAllDaySwitch = document.querySelector(`#portfolio-${portfolio.id} .portfolio-all-day-switch`);
    portfolioAllDaySwitch.textContent = portfolio.settings.allDayPeriod;
    drawPositions(portfolio);
    TTApi.savePortfolios();
}

/**
 * Изменить единицы измерения изменения цены: проценты или абсолютное значение
 * @param {Portfolio} portfolio
 */
function changePriceChangeUnit(portfolio) {
    portfolio.settings.priceChangeUnit = (portfolio.settings.priceChangeUnit == "Percents") ? "Absolute" : "Percents";
    const priceChangeUnitSwitch = document.querySelector(`#portfolio-${portfolio.id} .price-change-unit-switch`);
    priceChangeUnitSwitch.textContent = (portfolio.settings.priceChangeUnit == "Percents") ? "%" : "$";
    drawPositions(portfolio);
    TTApi.savePortfolios();
}

/**
 * Изменить единицы измерения ожидаемой прибыли: проценты или абсолютное значение
 * @param {Portfolio} portfolio
 */
function changePortfolioExpectedUnit(portfolio) {
    portfolio.settings.expectedUnit = (portfolio.settings.expectedUnit == "Percents") ? "Absolute" : "Percents";
    const portfolioExpectedUnitSwitch = document.querySelector(`#portfolio-${portfolio.id} .portfolio-expected-unit-switch`);
    portfolioExpectedUnitSwitch.textContent = (portfolio.settings.expectedUnit == "Percents") ? "%" : "$";
    drawPositions(portfolio);
    TTApi.savePortfolios();
}

/**
 * @type {HTMLInputElement} 
 * Чекбокс "Исключить валюту из строки подытоживающей строки Total"
 */
const excludeCurrenciesFromTotalCheckbox = document.querySelector("#excludeCurrenciesFromTotalCheckbox");
excludeCurrenciesFromTotalCheckbox.checked = (localStorage["excludeCurrenciesFromTotal"] === "true");
excludeCurrenciesFromTotalCheckbox.addEventListener("change", (e) => {
    // @ts-ignore
    localStorage.setItem("excludeCurrenciesFromTotal", e.target.checked);
    addPositionSummaryRow(TTApi.portfolios.find(portfolio => portfolio.id == selectedPortfolio));
});

// #endregion

// #region Token

/** @type {HTMLFormElement} */ //@ts-ignore
const tokenForm = document.getElementById("token-form");

tokenForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }

    const data = new FormData(tokenForm);
    const token = data.get("token").toString();
    localStorage.setItem("token", token);
    TTApi.token = token;

    setClassIf(eraseButton, "d-none", false);

    main();

    return false;
});

// #endregion

// #region Add position form

// @ts-ignore
$('#add-position-modal').on('shown.bs.modal', function () {
    // @ts-ignore
    $('#add-position-input').focus();
});

/** @type {HTMLFormElement} */ //@ts-ignore
const addPositionForm = document.getElementById("add-position-form");
const addPositionError = addPositionForm.querySelector(".status-message");
const addPositionInput = addPositionForm.querySelector("input");

addPositionInput.oninput = function () {
    addPositionError.textContent = "";
};

addPositionForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }

    const data = new FormData(addPositionForm);
    const ticker = data.get("position-ticker").toString().toUpperCase();

    const portfolio = TTApi.portfolios.find(item => item.id == selectedPortfolio);

    // Загружаем сделки по инструменту
    portfolio.loadFillsByTicker(ticker)
        .then(_ => TTApi.loadOrderbookByTicker(ticker))
        .then(orderbook => {
            addPositionInput.value = "";
            // @ts-ignore
            $('#add-position-modal').modal('hide');
            // Проставляем последнюю цену
            const position = portfolio.positions.find(item => item.ticker == ticker);
            position.lastPrice = orderbook.lastPrice;
            drawPositions(portfolio);
        })
        .catch(error => {
            addPositionError.textContent = error.message;
        });

    return false;
});

// #endregion

// #region Filter positions form

const filterPositionsForm = document.getElementById("filter-positions-form");
const filterPositionsError = filterPositionsForm.querySelector(".status-message");

filterPositionsForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }

    const defaultFilter = {
        currencies: {
            rub: true,
            usd: true,
            eur: true,
        },
        zeroPositions: {
            nonZero: true,
            zero: true,
        }
    }

    const getCheckBoxValue = (query) => filterPositionsForm.querySelector(query).checked;
    /** @type {import("./portfolio.js").PortfolioFilter} */
    const filter = {
        currencies: {
            rub: getCheckBoxValue("#filter-positions-currency-rub"),
            usd: getCheckBoxValue("#filter-positions-currency-usd"),
            eur: getCheckBoxValue("#filter-positions-currency-eur"),
        },
        zeroPositions: {
            nonZero: getCheckBoxValue("#filter-positions-non-zero"),
            zero: getCheckBoxValue("#filter-positions-zero"),
        }
    }

    if (!filter.zeroPositions.nonZero && !filter.zeroPositions.zero ||
        !Object.keys(filter.currencies).reduce((res, key) => res || filter.currencies[key], false)) {
        filterPositionsError.textContent = "Select at least one option in each section";
        return;
    } else {
        filterPositionsError.textContent = "";
    }

    const portfolio = TTApi.portfolios.find(item => item.id == selectedPortfolio);
    if (JSON.stringify(filter) == JSON.stringify(defaultFilter)) {
        delete portfolio.settings.filter;
    } else {
        portfolio.settings.filter = filter;
    }
    TTApi.savePortfolios();

    applyFilterPositionsButtonStyle(portfolio);

    drawPositions(portfolio);
    addPositionSummaryRow(portfolio);

    //@ts-ignore
    $('#filter-positions-modal').modal('hide');
});

/**
 * @param {Portfolio} portfolio 
 */
function applyFilterPositionsButtonStyle(portfolio) {
    const tabPane = findTabPane(`portfolio-${portfolio.id}`);
    const filterPositionsButton = tabPane.querySelector('button[data-target="#filter-positions-modal"]');
    setClassIf(filterPositionsButton, "text-primary", portfolio.settings.filter != undefined);
}

/**
 * Заполнить фильтр позиций
 * @param {Portfolio} portfolio 
 */
function fillPositionsFilterFields(portfolio) {
    applyFilterPositionsButtonStyle(portfolio);
    const setCheckBoxValue = (query, value) => filterPositionsForm.querySelector(query).checked = value;
    // Currencies
    setCheckBoxValue("#filter-positions-currency-rub", portfolio.settings.filter?.currencies?.rub ?? true);
    setCheckBoxValue("#filter-positions-currency-usd", portfolio.settings.filter?.currencies?.usd ?? true);
    setCheckBoxValue("#filter-positions-currency-eur", portfolio.settings.filter?.currencies?.eur ?? true);
    // Zero positions
    setCheckBoxValue("#filter-positions-non-zero", portfolio.settings.filter?.zeroPositions?.nonZero ?? true);
    setCheckBoxValue("#filter-positions-zero", portfolio.settings.filter?.zeroPositions?.zero ?? true);
}

// #endregion

// #region Filter operations form

const filterOperationsForm = document.getElementById("filter-operations-form");
const filterOperationsContainer = filterOperationsForm.querySelector(".modal-body .checkboxes-container");
const filterOperationsError = filterOperationsForm.querySelector(".status-message");

filterOperationsForm.querySelector("#filter-operations-select-all").addEventListener("click", (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    filterOperationsForm.querySelectorAll("[name=operationType]")
        //@ts-ignore
        .forEach(checkbox => checkbox.checked = true);
});

filterOperationsForm.querySelector("#filter-operations-select-none").addEventListener("click", (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    filterOperationsForm.querySelectorAll("[name=operationType]")
        //@ts-ignore
        .forEach(checkbox => checkbox.checked = false);
});

const operationTypes = [
    "PayIn",
    "Dividend",
    "Coupon",
    "BrokerCommission",
    "MarginCommission",
    "ServiceCommission",
    "TaxDividend",
    "Tax",
    "PayOut",
];
const defaultOperationsFilter = operationTypes;
let operationsFilter = JSON.parse(localStorage.getItem('operationsFilter')) || defaultOperationsFilter;

// @ts-ignore
$('#filter-operations-modal').on('shown.bs.modal', function () {
    addFilterOperationsCheckboxes();
});

function addFilterOperationsCheckboxes() {
    filterOperationsContainer.textContent = "";
    const fragment = document.createDocumentFragment();
    operationTypes.forEach(item => {
        /** @type {HTMLInputElement} */ //@ts-ignore
        const checkbox = document.querySelector('#filter-operations-checkbox-template').content.firstElementChild.cloneNode(true);

        const checkboxInput = checkbox.querySelector('input');
        checkboxInput.id = item;
        checkboxInput.name = "operationType";
        checkboxInput.checked = operationsFilter.includes(item);

        const checkboxLabel = checkbox.querySelector('label');
        checkboxLabel.textContent = item;
        checkboxLabel.setAttribute("for", item);

        fragment.appendChild(checkbox);
    });
    filterOperationsContainer.appendChild(fragment);
}

filterOperationsForm.addEventListener("submit", async (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    let filter = [];
    /** @type {NodeListOf<HTMLInputElement>} */
    const checkboxes = filterOperationsForm.querySelectorAll("[name=operationType]");
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            filter.push(checkbox.id);
        }
    });

    if (filter.length == 0) {
        filterOperationsError.textContent = "Select at least one option";
        return;
    } else {
        filterOperationsError.textContent = "";
        operationsFilter = filter;
    }

    localStorage.setItem('operationsFilter', JSON.stringify(operationsFilter));

    const filterOperationsButton = document.querySelector('button[data-target="#filter-operations-modal"]');
    setClassIf(filterOperationsButton, "text-primary", operationsFilter.length != defaultOperationsFilter.length);

    const portfolio = TTApi.portfolios.find(item => item.id == selectedPortfolio);

    const operations = await getOperationsRepository(portfolio.account).getAllByTypes(operationsFilter);
    drawSystemOperations(portfolio, operations);

    //@ts-ignore
    $('#filter-operations-modal').modal('hide');
});

// #endregion
