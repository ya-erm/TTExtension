import { getCurrencyRate, getPreviousDayClosePrice } from "./calculate.js";
import { Portfolio } from "./portfolio.js";
import { updatePosition } from "./position.js";
import { closeTab, createTab, findTab, openTab } from "./tabs.js";
import { TTApi } from "./TTApi.js";
import { convertToSlug, getMoneyColorClass, mapInstrumentType, printMoney, setClassIf } from "./utils.js";

let selectedPortfolio = localStorage.getItem("selectedPortfolio");

async function main() {
    if (!!TTApi.token) {
        document.getElementById("token-input").value = TTApi.token;

        await TTApi.getCurrencyRate("USD");

        // Создаём вкладки для каждого портфеля
        TTApi.portfolios.forEach(portfolio => {
            createPortfolioTab(portfolio);
            // Отображаем позиции из памяти для выбранного портфеля
            if (portfolio.id == selectedPortfolio) {
                drawCachedPositions(portfolio);
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
 * @param {object} portfolio портфель
 */
function selectPortfolio(portfolio) {
    findTab(`portfolio-${selectedPortfolio}`)?.setAttribute("data-default", "false");
    selectedPortfolio = portfolio.id;
    localStorage.setItem("selectedPortfolio", selectedPortfolio);
    findTab(`portfolio-${portfolio.id}`)?.setAttribute("data-default", "true");
}

/**
 * Отобразить позиции из памяти
 * @param {object} portfolio портфель
 */
function drawCachedPositions(portfolio) {
    portfolio.positions.forEach(position => addOrUpdatePosition(portfolio, position))
    addPositionSummaryRow(portfolio);
}

/**
 * Создать вкладку портфеля
 * @param {object} portfolio Портфель
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

        drawCachedPositions(portfolio);
        loopLoadPortfolio();
    });
    tabPane.querySelector("table").id = `portfolio-${portfolio.id}-table`;

    // Переключатель периода отображения прибыли (за день, за всё время)
    const portfolioAllDaySwitch = tabPane.querySelector(".portfolio-all-day-switch");
    portfolioAllDaySwitch.addEventListener("click", () => changePortfolioAllDay(portfolio));
    portfolioAllDaySwitch.textContent = portfolio.allDayPeriod;

    // Переключатель единицы измерения изменения цены за день (проценты, абсолютное значение)
    const priceChangeUnitSwitch = tabPane.querySelector(".price-change-unit-switch");
    priceChangeUnitSwitch.addEventListener("click", () => changePriceChangeUnit(portfolio));
}

// Обработчик события обновления позиции
window.addEventListener("PositionUpdated", function (event) {
    const { position } = event.detail;
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == position.portfolioId);
    addOrUpdatePosition(portfolio, position);
    addPositionSummaryRow(portfolio);
});

// Обработчик события удаления позиции
window.addEventListener("PositionRemoved", function (event) {
    const { position } = event.detail;
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == position.portfolioId);
    document.querySelector(`#portfolio-${portfolio.id}_position-${position.figi}`)?.remove();
    addPositionSummaryRow(portfolio);
});

// Загрузка портфеля
async function loadPortfolio() {
    const portfolio = TTApi.portfolios.find(portfolio => portfolio.id == selectedPortfolio);
    if (portfolio != undefined) {
        const positions = await portfolio.loadPositions();
        positions.forEach(position => addOrUpdatePosition(portfolio, position));
        loadPriceChange(portfolio);
    }
}

// Циклическая загрузка портфеля
function loopLoadPortfolio() {
    loadPortfolio();
    if (positionsUpdateTimerId != undefined) {
        clearTimeout(positionsUpdateTimerId)
    }
    positionsUpdateTimerId = setInterval(loadPortfolio, updateIntervalTimeout);
}

// Добавить или обновить строку позиции
function addOrUpdatePosition(portfolio, position) {
    const positionRow = document.getElementById(`portfolio-${portfolio.id}_position-${position.figi}`);
    if (!positionRow) {
        addPositionRow(portfolio, position);
    } else {
        fillPositionRow(portfolio, positionRow, position);
    }
}

/**
  * Создать новую строку в таблице позиций
  * @param {object} position - позиция
  */
function addPositionRow(portfolio, position) {
    const positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `portfolio-${portfolio.id}_position-${position.figi}`;

    const cellAsset = positionRow.querySelector("td.portfolio-asset");
    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
        ? position.ticker + ' - ' + position.name
        : position.name;
    cellAsset.querySelector("span").title = cellAsset.querySelector("span").textContent;
    cellAsset.querySelector(".portfolio-logo").style["backgroundImage"] = `url("https://static.tinkoff.ru/brands/traiding/${position.isin}x160.png")`;

    fillPositionRow(portfolio, positionRow, position);

    const tbody = document.querySelector(`#portfolio-${portfolio.id}-table tbody.positions-${position.instrumentType.toLowerCase()}`);
    if (!tbody.querySelector(".group-row")) {
        const groupRow = document.querySelector('#portfolio-group-row-template').content.firstElementChild.cloneNode(true);
        groupRow.querySelector("td").textContent = mapInstrumentType(position.instrumentType);
        tbody.appendChild(groupRow);
    }
    tbody.appendChild(positionRow);

    positionRow.addEventListener("click", () => onPositionClick(portfolio, position));
}

/**
  * Заполнить строку в таблице позиций данными
  * @param {object} portfolio - портфель
  * @param {object} positionRow - строка таблицы
  * @param {object} position - позиция
  */
function fillPositionRow(portfolio, positionRow, position) {
    if (position.count == 0) {
        if (!positionRow.querySelector(".portfolio-asset-button-remove")) {
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

    const calculatedCountNotEqualActual = position.calculatedCount && position.calculatedCount != position.count;
    const inaccurateValue = position.needCalc || calculatedCountNotEqualActual;

    const cellCount = positionRow.querySelector("td.portfolio-count");
    cellCount.textContent = position.count;
    setClassIf(cellCount, "inaccurate-value-text", calculatedCountNotEqualActual);
    if (calculatedCountNotEqualActual) {
        cellCount.title = `Calculated by fills: ${position.calculatedCount}\n` +
            `Actual value: ${position.count}`;
    }

    const cellAverage = positionRow.querySelector("td.portfolio-average");
    cellAverage.title = "";
    let average = position.average;
    if (position.count == 0) {
        const fills = portfolio.fills[position.ticker];
        if (fills?.length > 1) {
            const fill = fills[fills.length - 2];
            average = fill.averagePrice;
            const fillDate = fill.date.toString().substring(0, 19).replace(/-/g, "/").replace("T", " ");
            cellAverage.title = `Last trade average price (${fillDate})`;
        }
    }
    cellAverage.textContent = printMoney(average, position.currency);
    setClassIf(cellAverage, "inaccurate-value-text", inaccurateValue || position.count == 0);

    const cellLast = positionRow.querySelector("td.portfolio-last");
    cellLast.textContent = printMoney(position.lastPrice, position.currency);
    cellLast.title = "Updated at " + new Date(position.lastPriceUpdated).toTimeString().substring(0, 8);

    const cellCost = positionRow.querySelector("td.portfolio-cost");
    cellCost.textContent = (position.count != 0)
        ? printMoney(position.count * position.lastPrice, position.currency)
        : "";
    setClassIf(cellCost, "inaccurate-value-text", inaccurateValue);

    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    cellExpected.textContent = printMoney(position.expected, position.currency, true);
    cellExpected.className = getMoneyColorClass(position.expected);
    setClassIf(cellExpected, "inaccurate-value-text", inaccurateValue);

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    if (portfolio.allDayPeriod == "All") {
        cellFixedPnL.textContent = printMoney(position.fixedPnL, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(position.fixedPnL);
    } else {
        const fixedPnLToday = getTodayFixedPnL(portfolio, position);
        cellFixedPnL.textContent = printMoney(fixedPnLToday, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(fixedPnLToday);
    }
}

// Рассчитать зафиксированную прибыль за торговый день
function getTodayFixedPnL(portfolio, position) {
    const now = new Date();
    const fills = portfolio.fills[position.ticker] || [];
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

// Добавить итоговую строку по позициям
function addPositionSummaryRow(portfolio) {
    let positionRow = document.getElementById(`portfolio-${portfolio.id}_position-summary`);
    if (positionRow) { positionRow.remove(); }

    positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `portfolio-${portfolio.id}_position-summary`;

    setClassIf(positionRow, "cursor-pointer", false);

    const total = portfolio.positions.reduce((result, position) => {
        result.cost[position.currency] = (position.count || 0) * (position.average || 0) + (position.expected || 0) + (result.cost[position.currency] || 0);
        result.expected[position.currency] = (position.expected || 0) + (result.expected[position.currency] || 0);
        const fixedPnL = (portfolio.allDayPeriod == "All") ? position.fixedPnL : getTodayFixedPnL(portfolio, position);
        result.fixedPnL[position.currency] = (fixedPnL || 0) + (result.fixedPnL[position.currency] || 0);
        return result;
    }, { cost: {}, expected: {}, fixedPnL: {} });

    const selectedCurrency = localStorage["selectedCurrency"] || "RUB";

    let totalCostTitle = "Portfolio cost now \n";
    const totalCost = Object.keys(total.expected).reduce((result, key) => {
        totalCostTitle += `${key}: ${printMoney(total.cost[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.cost[key];
    }, 0);

    let totalExpectedTitle = "Total expected \n";
    const totalExpected = Object.keys(total.expected).reduce((result, key) => {
        totalExpectedTitle += `${key}: ${printMoney(total.expected[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.expected[key];
    }, 0);

    let totalFixedPnLTitle = (portfolio.allDayPeriod == "All") ? "Total fixed P&L \n" : "Fixed P&L today \n";
    const totalFixedPnL = Object.keys(total.fixedPnL).reduce((result, key) => {
        totalFixedPnLTitle += `${key}: ${printMoney(total.fixedPnL[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : getCurrencyRate(key, selectedCurrency)) * total.fixedPnL[key];
    }, 0);

    const cellCost = positionRow.querySelector("td.portfolio-cost");
    cellCost.textContent = "Total:"

    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    cellExpected.textContent = printMoney(totalExpected, selectedCurrency, true);
    cellExpected.className = getMoneyColorClass(totalExpected);
    cellExpected.title = totalExpectedTitle;
    cellExpected.addEventListener('click', _ => changeSelectedCurrency(portfolio, selectedCurrency));
    setClassIf(cellExpected, "cursor-pointer", true);

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    cellFixedPnL.textContent = printMoney(totalFixedPnL, selectedCurrency, true);
    cellFixedPnL.className = getMoneyColorClass(totalFixedPnL);
    cellFixedPnL.title = totalFixedPnLTitle;
    cellFixedPnL.addEventListener('click', _ => changeSelectedCurrency(portfolio, selectedCurrency));
    setClassIf(cellFixedPnL, "cursor-pointer", true);

    const assetCell = positionRow.querySelector("td.portfolio-asset");
    assetCell.innerHTML = '<a href="#" class="btn-link">Operations</a>';
    assetCell.addEventListener("click", onOperationsLinkClick);

    const tbody = document.querySelector(`#portfolio-${portfolio.id}-table tbody.positions-summary-row`);
    tbody.appendChild(positionRow);

    const totalCostSpanPrev = document.querySelector(".portfolio-total-cost");
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

// Изменить выбранную для отображения итоговой суммы валюту
function changeSelectedCurrency(portfolio, selectedCurrency) {
    if (selectedCurrency == "RUB") {
        selectedCurrency = "USD";
    } else {
        selectedCurrency = "RUB";
    }
    localStorage.setItem("selectedCurrency", selectedCurrency);
    addPositionSummaryRow(portfolio);
};

// Обработчик нажатия на строку в таблице позиций
function onPositionClick(portfolio, position) {
    const ticker = position.ticker;
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(ticker)}`;
    // Если вкладка не существует
    if (!findTab(tabId)) {
        // Создаём и добавляем вкладку
        const { tab, tabPane } = createTab("nav-tab-closable-template", "tab-pane-fills-template", ticker, tabId);

        tab.querySelector(".tab-close-button").addEventListener('click', () => closeTab(tabId));

        // Отображаем сделки из памяти
        if (portfolio.fills[position.ticker]) {
            drawOperations(portfolio, position, portfolio.fills[position.ticker]);
        }

        // Загружаем новые сделки и обновляем таблицу
        portfolio.loadFillsByTicker(position.ticker)
            .then((fills) => drawOperations(portfolio, position, fills));
    }
    // Открываем вкладку
    openTab(tabId);
}

// Обработчик нажатия на ссылку операций
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

        portfolio.loadOperations()
            .then((operations) => {
                setClassIf(loadingSpinner, "d-none", true);
                DrawSystemOperations(portfolio, operations);
            });
        const filterOperationsButton = document.querySelector('button[data-target="#filter-operations-modal"]');
        setClassIf(filterOperationsButton, "text-primary", operationsFilter.length != defaultOperationsFilter.length);
    }
    // Открываем вкладку
    openTab(tabId);
}

// Обработчик нажатия на кнопку удаления позиции
function onPositionRemoveClick(portfolio, position) {
    portfolio.removePosition(position);
}

// Получить изменение цены за день
function loadPriceChange(portfolio) {
    portfolio.positions.forEach(position => {
        addOrUpdatePosition(portfolio, position);
        if (position.figi != "RUB") {
            getPreviousDayClosePrice(position.figi) // TODO: добавить кэширование и троттлинг
                .then(previousDayPrice => drawPriceChange(portfolio, position, previousDayPrice));
        }
    });
}

// Отрисовка изменения цены актива
function drawPriceChange(portfolio, position, previousDayPrice) {
    const positionRow = document.getElementById(`portfolio-${portfolio.id}_position-${position.figi}`);
    const cellChange = positionRow.querySelector("td.portfolio-change span");

    let change = portfolio.priceChangeUnit == "Percents"
        ? 100 * position.lastPrice / previousDayPrice - 100
        : position.lastPrice - previousDayPrice;
    if (change < 0.01) { change = 0; }
    const unit = portfolio.priceChangeUnit == "Percents" ? "%" : position.currency;
    cellChange.title = `Previous trading day close price: ${printMoney(previousDayPrice, position.currency)}`;
    cellChange.textContent = printMoney(change, unit, true);
    cellChange.className = getMoneyColorClass(change);
}

// #endregion

// #region Operations

function drawOperations(portfolio, position, fills) {
    const tabId = `portfolio-${portfolio.id}_${convertToSlug(position.ticker)}`;
    const tbody = document.querySelector(`#${tabId} table tbody`)
    tbody.innerHTML = "";

    fills.forEach((item, index) => {
        const fillRow = document.querySelector("#fills-row-template").content.firstElementChild.cloneNode(true);

        const cellIndex = fillRow.querySelector("td.fills-index");
        cellIndex.textContent = index + 1;

        const cellTime = fillRow.querySelector("td.fills-time");
        cellTime.textContent = item.date.substring(5, 19).replace(/-/g, "/").replace("T", " ");
        cellTime.title = new Date(item.date).toString().split(" (")[0];

        const cellType = fillRow.querySelector("td.fills-type span");
        cellType.textContent = item.operationType == "BuyCard" ? "Buy" : item.operationType;
        cellType.className = item.operationType === "Sell" ? "text-danger" : "text-success";

        const cellPrice = fillRow.querySelector("td.fills-price");
        cellPrice.textContent = item.price.toFixed(2);

        const cellCount = fillRow.querySelector("td.fills-count");
        cellCount.textContent = (-Math.sign(item.payment) == -1 ? "-" : "+") + item.quantity;

        const cellPayment = fillRow.querySelector("td.fills-payment");
        cellPayment.textContent = item.payment.toFixed(2);

        const cellFee = fillRow.querySelector("td.fills-fee");
        cellFee.textContent = item.commission?.toFixed(2);

        const cellCurrent = fillRow.querySelector("td.fills-current");
        cellCurrent.textContent = item.currentQuantity;

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

    const fillRow = document.querySelector("#fills-row-template").content.firstElementChild.cloneNode(true);

    const cellFee = fillRow.querySelector("td.fills-fee");
    cellFee.textContent = fills.reduce((res, fill) => res + fill.commission, 0.0)?.toFixed(2);
    cellFee.title = "Total commission";

    const cellFixedPnL = fillRow.querySelector("td.fills-fixed-pnl span");
    cellFixedPnL.textContent = position.fixedPnL?.toFixed(2);
    cellFixedPnL.className = position.fixedPnL < 0 ? "text-danger" : "text-success";
    cellFixedPnL.title = "Total fixed P&L";

    tbody.prepend(fillRow);
}

async function DrawSystemOperations(portfolio, operations) {
    const tabId = `portfolio-${portfolio.id}_operations`;
    const filteredOperations = operations
        .filter(item => !["Buy", "BuyCard", "Sell", "BrokerCommission"].includes(item.operationType))
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
        .reverse()
        .forEach((item, index) => {
            const fillRow = document.querySelector("#money-row-template").content.firstElementChild.cloneNode(true);

            const cellIndex = fillRow.querySelector("td.money-index");
            cellIndex.textContent = index + 1;

            const cellTime = fillRow.querySelector("td.money-time");
            cellTime.textContent = item.date.substring(0, 19).replace(/-/g, "/").replace("T", " ");
            cellTime.title = new Date(item.date).toString().split(" (")[0];

            const cellPayment = fillRow.querySelector("td.money-payment");
            cellPayment.textContent = printMoney(item.payment, item.currency);

            const cellType = fillRow.querySelector("td.money-type span");
            cellType.textContent = item.operationType;
            applyStyleByType(cellType, item.operationType);

            const cellAsset = fillRow.querySelector("td.portfolio-asset");
            if (item.operationType == "Dividend" || item.operationType == "Coupon" || item.operationType == "TaxDividend") {
                const position = positions.find(position => position.figi == item.figi);
                if (position != undefined) {
                    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
                    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
                    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
                        ? position.ticker + ' - ' + position.name
                        : position.name;
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
        .filter(key => key == "MarginCommission" || key == "ServiceCommission" || key == "Dividend" || key == "Coupon")
        .forEach(key => {
            const group = total[key];
            let totalValue = 0;
            let totalValueTitle = `Total ${key} \n`;

            // Конвертируем из других валют в выбранную
            Object.keys(group).forEach(currency => {
                totalValue += group[currency] * getCurrencyRate(currency, selectedCurrency)
                totalValueTitle += `${currency}: ${printMoney(group[currency], currency)}\n`;
            });

            const fillRow = document.querySelector("#money-row-template").content.firstElementChild.cloneNode(true);

            const cellPayment = fillRow.querySelector("td.money-payment");
            cellPayment.textContent = printMoney(totalValue, selectedCurrency);

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

// #endregion

// #region Settings

const webTerminalCheckbox = document.querySelector("#webTerminalCheckbox");
webTerminalCheckbox.checked = (localStorage["overrideAveragePriceOnWebTerminal"] === "true");
webTerminalCheckbox.addEventListener("change", (e) => {
    localStorage["overrideAveragePriceOnWebTerminal"] = e.target.checked;
});

let updateIntervalTimeout = localStorage["positionsUpdateIntervalInput"] || 60 * 1000;
let positionsUpdateTimerId;

const updateIntervalInput = document.querySelector("#updateIntervalInput");
updateIntervalInput.value = updateIntervalTimeout / 1000;
updateIntervalInput.addEventListener("change", (e) => {
    updateIntervalTimeout = e.target.value * 1000;
    localStorage["positionsUpdateIntervalInput"] = updateIntervalTimeout;
    console.log(`Positions update interval changed. New value: ${updateIntervalTimeout} ms`)
    loopLoadPortfolio();
});

const eraseButton = document.getElementById("erase-button");
eraseButton.addEventListener("click", () => {
    // Очищаем хранилище и страницу
    localStorage.clear();
    document.getElementById("token-input").value = "";
    $("#portfolio-table tbody").children().remove();
    $(".nav-item[data-closable='true']").remove();
    document.querySelectorAll(".nav-item")
        .forEach(item => {
            if (!item.querySelector("#settings-tab")) {
                item.remove();
            }
        });
    document.querySelector(".portfolio-total-cost").innerHTML = "";
    TTApi.eraseData();
    // Скрываем кнопку очистки хранилища
    setClassIf(eraseButton, "d-none", true);
});

// Изменить период отображаемой прибыли: за всё время или за торговый день
function changePortfolioAllDay(portfolio) {
    portfolio.allDayPeriod = (portfolio.allDayPeriod == "All") ? "Day" : "All";
    const portfolioAllDaySwitch = document.querySelector(`#portfolio-${portfolio.id} .portfolio-all-day-switch`);
    portfolioAllDaySwitch.textContent = portfolio.allDayPeriod;
    portfolio.positions.forEach(position => addOrUpdatePosition(portfolio, position));
    addPositionSummaryRow(portfolio);
    TTApi.savePortfolios();
}

// Изменить единицы измерения изменения цены: проценты или абсолютное значение
function changePriceChangeUnit(portfolio) {
    portfolio.priceChangeUnit = (portfolio.priceChangeUnit == "Percents") ? "Absolute" : "Percents";
    loadPriceChange(portfolio);
    TTApi.savePortfolios();
}

// #endregion

// #region Token

const tokenForm = document.getElementById("token-form");

// Обработчик сабмита формы с токеном
tokenForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }

    const data = new FormData(tokenForm);
    const token = data.get("token");
    localStorage.setItem("token", token);
    TTApi.token = token;

    setClassIf(eraseButton, "d-none", false);

    main();

    return false;
});

// #endregion

// #region Add position form

$('#add-position-modal').on('shown.bs.modal', function () {
    $('#add-position-input').focus();
});

const addPositionForm = document.getElementById("add-position-form");
const addPositionError = addPositionForm.querySelector(".status-message");
const addPositionInput = addPositionForm.querySelector("input");

addPositionInput.oninput = function () {
    addPositionError.textContent = "";
};

// Обработчик сабмита формы
addPositionForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }

    const data = new FormData(addPositionForm);
    const ticker = data.get("position-ticker");

    const portfolio = TTApi.portfolios.find(item => item.id == selectedPortfolio);

    // Загружаем сделки по инструменту
    portfolio.loadFillsByTicker(ticker)
        .then(_ => TTApi.loadOrderbookByTicker(ticker))
        .then(orderbook => {
            addPositionInput.value = "";
            $('#add-position-modal').modal('hide');
            // Проставляем последнюю цену
            const position = portfolio.positions.find(item => item.ticker == ticker);
            position.lastPrice = orderbook.lastPrice;
            updatePosition(position);
        })
        .catch(error => {
            addPositionError.textContent = error.message;
        });

    return false;
});

// #endregion

// #region Filter operations form

const filterOperationsForm = document.getElementById("filter-operations-form");
const filterOperationsContainer = filterOperationsForm.querySelector(".modal-body .checkboxes-container");
const filterOperationsError = filterOperationsForm.querySelector(".status-message");

filterOperationsForm.querySelector("#filter-operations-select-all").addEventListener("click", (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    filterOperationsForm.querySelectorAll("[name=operationType]")
        .forEach(checkbox => checkbox.checked = true);
});

filterOperationsForm.querySelector("#filter-operations-select-none").addEventListener("click", (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    filterOperationsForm.querySelectorAll("[name=operationType]")
        .forEach(checkbox => checkbox.checked = false);
});

const operationTypes = [
    "MarginCommission",
    "ServiceCommission",
    "TaxDividend",
    "Tax",
    "Dividend",
    "Coupon",
    "PayIn",
    "PayOut",
];
const defaultOperationsFilter = operationTypes;
let operationsFilter = JSON.parse(localStorage.getItem('operationsFilter')) || defaultOperationsFilter;

$('#filter-operations-modal').on('shown.bs.modal', function () {
    addFilterOperationsCheckboxes();
});

function addFilterOperationsCheckboxes() {
    filterOperationsContainer.textContent = "";
    operationTypes.forEach(item => {
        const checkbox = document.querySelector('#filter-operations-checkbox-template').content.firstElementChild.cloneNode(true);

        const checkboxInput = checkbox.querySelector('input');
        checkboxInput.id = item;
        checkboxInput.name = "operationType";
        checkboxInput.checked = operationsFilter.includes(item);

        const checkboxLabel = checkbox.querySelector('label');
        checkboxLabel.textContent = item;
        checkboxLabel.setAttribute("for", item);

        filterOperationsContainer.appendChild(checkbox);
    });
}

filterOperationsForm.addEventListener("submit", (e) => {
    if (e.preventDefault) { e.preventDefault(); }
    let filter = [];
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

    DrawSystemOperations(portfolio, portfolio.operations[undefined]);

    $('#filter-operations-modal').modal('hide');
});

// #endregion
