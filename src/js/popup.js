import { TTApi } from "./TTApi.js";

const eraseButton = document.getElementById("erase-button");
eraseButton.addEventListener("click", () => {
    // Очищаем хранилище и страницу
    localStorage.clear();
    document.getElementById("token-input").value = "";
    $("#portfolio-table tbody").children().remove();
    $(".nav-item[data-closable='true']").remove();
    document.querySelector(".portfolio-total-cost").innerHTML = "";
    TTApi.eraseData();
    // Скрываем кнопку очистки хранилища
    setClassIf(eraseButton, "d-none", true);
});

// Загружаем токен из localStorage
let updateIntervalTimeout = localStorage["positionsUpdateIntervalInput"] || 60 * 1000;
let positionsUpdateTimerId;

// Переключатель периода отображения прибыли
const portfolioAllDaySwitch = document.querySelector(".portfolio-all-day-switch");
portfolioAllDaySwitch.addEventListener("click", changePortfolioAllDay);
let portfolioAllDayPeriod = localStorage["portfolioAllDaySwitch"] || "All";
portfolioAllDaySwitch.textContent = portfolioAllDayPeriod;

// Изменить период отображаемой прибыли: за всё время или за торговый день
function changePortfolioAllDay() {
    portfolioAllDayPeriod = (portfolioAllDayPeriod == "All") ? "Day" : "All";
    portfolioAllDaySwitch.textContent = portfolioAllDayPeriod;
    localStorage["portfolioAllDaySwitch"] = portfolioAllDayPeriod;
    TTApi.positions.forEach(position => AddOrUpdatePosition(position));
    addPositionSummaryRow(TTApi.positions);
}

if (!!TTApi.token) {
    document.getElementById("token-input").value = TTApi.token;

    // Отображаем позиции из памяти
    TTApi.positions.forEach(position => addPositionRow(position))
    addPositionSummaryRow(TTApi.positions);

    // Загружаем новые позиции и обновляем таблицу
    loopLoadPortfolio();
} else {
    // Открываем вкладку настроек
    $("#settings-tab").tab("show");
    // Скрываем кнопку очистки хранилища
    setClassIf(eraseButton, "d-none", true);
}

// #region Positions

// Обработчик события обновления позиции
window.addEventListener("PositionUpdated", function (event) {
    const { position } = event.detail;
    AddOrUpdatePosition(position);
    addPositionSummaryRow(TTApi.positions);
});

// Обработчик события удаления позиции
window.addEventListener("PositionRemoved", function (event) {
    const { position } = event.detail;
    document.querySelector(`#position-${position.figi}`)?.remove();
    addPositionSummaryRow(TTApi.positions);
});

// Загрузка портфеля
function loadPortfolio() {
    TTApi.loadPortfolio()
        .then(positions => positions.forEach(position => AddOrUpdatePosition(position)));
}

// Циклическая загрузка портфеля
function loopLoadPortfolio() {
    loadPortfolio();
    if (positionsUpdateTimerId != undefined) {
        clearTimeout(positionsUpdateTimerId)
    }
    positionsUpdateTimerId = setInterval(loadPortfolio, updateIntervalTimeout);
}

function AddOrUpdatePosition(position) {
    var positionRow = document.getElementById(`position-${position.figi}`);
    if (!positionRow) {
        addPositionRow(position);
    } else {
        fillPositionRow(positionRow, position);
    }
}

/**
  * Создать новую строку в таблице позиций
  * @param {object} position - позиция
  */
function addPositionRow(position) {
    const positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `position-${position.figi}`;

    const cellAsset = positionRow.querySelector("td.portfolio-asset");
    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
        ? position.ticker + ' - ' + position.name
        : position.name;
    cellAsset.querySelector(".portfolio-logo").style["backgroundImage"] = `url("https://static.tinkoff.ru/brands/traiding/${position.isin}x160.png")`;

    fillPositionRow(positionRow, position);

    const tbody = document.querySelector(`#portfolio-table tbody.positions-${position.instrumentType.toLowerCase()}`);
    if (!tbody.querySelector(".group-row")) {
        const groupRow = document.querySelector('#portfolio-group-row-template').content.firstElementChild.cloneNode(true);
        groupRow.querySelector("td").textContent = mapInstrumentType(position.instrumentType);
        tbody.appendChild(groupRow);
    }
    tbody.appendChild(positionRow);

    positionRow.addEventListener("click", () => onPositionClick(position));
}

/**
  * Заполнить строку в таблице позиций данными
  * @param {object} positionRow - строка таблицы
  * @param {object} position - позиция
  */
function fillPositionRow(positionRow, position) {
    if (position.count == 0) {
        if (!positionRow.querySelector(".portfolio-asset-button-remove")) {
            const buttonRemove = document.querySelector("#portfolio-asset-button-remove-template").content.firstElementChild.cloneNode(true);
            buttonRemove.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                onPositionRemoveClick(position);
            });
            positionRow.querySelector(".portfolio-asset div").appendChild(buttonRemove);
        }
    } else {
        positionRow.querySelector(".portfolio-asset-button-remove")?.remove();
    }

    const cellCount = positionRow.querySelector("td.portfolio-count");
    cellCount.textContent = position.count;

    const cellAverage = positionRow.querySelector("td.portfolio-average");
    cellAverage.textContent = printMoney(position.average, position.currency);
    setClassIf(cellAverage, "inaccurate-value-text", position.needCalc);

    const cellLast = positionRow.querySelector("td.portfolio-last");
    cellLast.textContent = printMoney(position.lastPrice, position.currency);
    cellLast.title = "Updated at " + new Date(position.lastPriceUpdated).toTimeString().substring(0, 8);

    const cellCost = positionRow.querySelector("td.portfolio-cost");
    cellCost.textContent = (position.count != 0)
        ? printMoney(position.count * position.lastPrice, position.currency)
        : "";
    setClassIf(cellCost, "inaccurate-value-text", position.needCalc);

    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    cellExpected.textContent = printMoney(position.expected, position.currency, true);
    cellExpected.className = getMoneyColorClass(position.expected);
    setClassIf(cellExpected, "inaccurate-value-text", position.needCalc);

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    if (portfolioAllDayPeriod == "All") {
        cellFixedPnL.textContent = printMoney(position.fixedPnL, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(position.fixedPnL);
    } else {
        const fixedPnLToday = getTodayFixedPnL(position);
        cellFixedPnL.textContent = printMoney(fixedPnLToday, position.currency, true);
        cellFixedPnL.className = getMoneyColorClass(fixedPnLToday);
    }
}

// Рассчитать зафиксированную прибыль за торговый день
function getTodayFixedPnL(position) {
    const now = new Date();
    const fills = TTApi.fills[position.ticker] || [];
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
  * Получить курс валюты
  * @param {string} from - из какой валюты
  * @param {string} to - в какую валюту
  */
function getCurrencyRate(from, to) {
    if (from == to) { return 1.0 }

    const usdToRub = TTApi.positions.find(_ => _.figi == "BBG0013HGFT4")?.lastPrice; // Доллар США
    if (from == "USD" && to == "RUB") {
        return usdToRub;
    } else if (from == "RUB" && to == "USD") {
        return 1.0 / usdToRub;
    }

    const eurToRub = TTApi.positions.find(_ => _.figi == "BBG0013HJJ31")?.lastPrice; // Евро
    if (from == "EUR" && to == "RUB") {
        return eurToRub;
    } else if (from == "RUB" && to == "EUR") {
        return 1.0 / eurToRub;
    }
}

// Добавить итоговую строку по позициям
function addPositionSummaryRow(positions) {
    let positionRow = document.getElementById("position-summary");
    if (positionRow) { positionRow.remove(); }

    positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = "position-summary";

    setClassIf(positionRow, "cursor-pointer", false);

    const total = positions.reduce((result, position) => {
        result.cost[position.currency] = (position.count || 0) * (position.average || 0) + (position.expected || 0) + (result.cost[position.currency] || 0);
        result.expected[position.currency] = (position.expected || 0) + (result.expected[position.currency] || 0);
        const fixedPnL = (portfolioAllDayPeriod == "All") ? position.fixedPnL : getTodayFixedPnL(position);
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

    let totalFixedPnLTitle = (portfolioAllDayPeriod == "All") ? "Total fixed P&L \n" : "Fixed P&L today \n";
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
    cellExpected.addEventListener('click', _ => changeSelectedCurrency(selectedCurrency));
    setClassIf(cellExpected, "cursor-pointer", true);

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    cellFixedPnL.textContent = printMoney(totalFixedPnL, selectedCurrency, true);
    cellFixedPnL.className = getMoneyColorClass(totalFixedPnL);
    cellFixedPnL.title = totalFixedPnLTitle;
    cellFixedPnL.addEventListener('click', _ => changeSelectedCurrency(selectedCurrency));
    setClassIf(cellFixedPnL, "cursor-pointer", true);

    const assetCell = positionRow.querySelector("td.portfolio-asset");
    assetCell.innerHTML = '<a href="#" class="btn-link">Operations</a>';
    assetCell.addEventListener("click", onOperationsLinkClick);

    const tbody = document.querySelector("#portfolio-table tbody.positions-summary-row");
    tbody.appendChild(positionRow);

    const totalCostSpan = document.querySelector(".portfolio-total-cost");
    const oldTotalCost = parseFloat(totalCostSpan.innerHTML.replace(/ /g, ''));
    totalCostSpan.innerHTML = printMoney(totalCost, selectedCurrency);
    totalCostSpan.title = totalCostTitle;
    totalCostSpan.addEventListener('click', _ => changeSelectedCurrency(selectedCurrency));

    if (oldTotalCost && Math.abs(totalCost - oldTotalCost) > 0.01) {
        console.log('Portfolio changed:', 'oldTotalCost', oldTotalCost, 'totalCost', totalCost);
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
function changeSelectedCurrency(selectedCurrency) {
    if (selectedCurrency == "RUB") {
        selectedCurrency = "USD";
    } else {
        selectedCurrency = "RUB";
    }
    localStorage.setItem("selectedCurrency", selectedCurrency);
    addPositionSummaryRow(TTApi.positions);
};

// Обработчик нажатия на строку в таблице позиций
function onPositionClick(position) {
    const ticker = position.ticker;
    const mainNav = document.querySelector("#main-nav");
    // Если вкладка не существует
    if (!mainNav.querySelector(`#${convertToSlug(ticker)}-tab`)) {
        // Создаём и добавляем вкладку
        const mainTabContent = document.querySelector("#main-tab-content");
        const { tab, tabPane } = createTab("nav-tab-template", "tab-pane-fills-template", ticker, convertToSlug(ticker));
        mainNav.appendChild(tab);
        mainTabContent.appendChild(tabPane);

        tab.querySelector(".tab-close-button").addEventListener('click', () => closeTab(convertToSlug(ticker)));

        // Отображаем сделки из памяти
        if (TTApi.fills[position.ticker]) {
            drawOperations(position, TTApi.fills[position.ticker]);
        }

        // Загружаем новые сделки и обновляем таблицу
        TTApi.loadFillsByFigi(position.figi)
            .then((fills) => drawOperations(position, fills));
    }
    // Открываем вкладку
    $(`#${convertToSlug(ticker)}-tab`).tab('show');
}

// Обработчик нажатия на ссылку операций
function onOperationsLinkClick() {
    const ticker = "Operations";
    const mainNav = document.querySelector("#main-nav");
    // Если вкладка не существует
    if (!mainNav.querySelector(`#${ticker}-tab`)) {
        // Создаём и добавляем вкладку
        const mainTabContent = document.querySelector("#main-tab-content");
        const { tab, tabPane } = createTab("nav-tab-template", "tab-pane-money-template", ticker, ticker);
        mainNav.appendChild(tab);
        mainTabContent.appendChild(tabPane);

        tab.querySelector(".tab-close-button").addEventListener('click', () => closeTab(ticker));

        tabPane.querySelector(".loading-content-text").textContent = "Loading...";
        TTApi.loadFillsByFigi()
            .then((operations) => {
                tabPane.querySelector(".loading-content-text").textContent = "";
                DrawSystemOperations(operations);
            });
        const filterOperationsButton = document.querySelector('button[data-target="#filter-operations-modal"]');
        setClassIf(filterOperationsButton, "text-primary", operationsFilter.length != defaultOperationsFilter.length);
    }
    // Открываем вкладку
    $(`#${ticker}-tab`).tab('show');
}

// Обработчик нажатия на кнопку удаления позиции
function onPositionRemoveClick(position) {
    TTApi.removePosition(position);
}

// #endregion

// #region Operations

function drawOperations(position, fills) {
    const tbody = document.querySelector(`#${convertToSlug(position.ticker)} table tbody`)
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

async function DrawSystemOperations(operations) {
    const ticker = "Operations";
    const filteredOperations = operations
        .filter(item => !["Buy", "BuyCard", "Sell", "BrokerCommission"].includes(item.operationType))
        .filter(item => operationsFilter.includes(item.operationType));

    const distinct = (value, index, self) => self.indexOf(value) === index;
    const positions = await Promise.all(filteredOperations
        .map(item => item.figi)
        .filter(distinct)
        .filter(item => item != undefined)
        .map(async (figi) => await TTApi.findPosition(figi)));


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

    const tbody = document.querySelector(`#${ticker} table tbody.money-detailed`);
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

    const tbodySummary = document.querySelector(`#${ticker} table tbody.money-summary`);
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


//#endregion

// #region Utilities

// Конвертация строкового представления валюты в символ
function mapCurrency(currency) {
    if (!currency) { return ""; }
    switch (currency) {
        case "RUB": return "₽";
        case "USD": return "$";
        case "EUR": return "€";
        default: return currency;
    }
}

// Отображение денежного значения
function printMoney(value, currency, withSign = false) {
    if (value == null || value == undefined || isNaN(value)) { return ""; }
    const sign = (withSign && value > 0 ? '+' : '')
    return `${sign}${value?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${mapCurrency(currency)}`;
}

// CSS-класс цвета денежного значения
function getMoneyColorClass(value) {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return '';
}

// Конвертация типа инструмента в название группы
function mapInstrumentType(type) {
    switch (type) {
        case "Stock": return "Stocks";
        case "Bond": return "Bonds";
        case "Etf": return "ETF";
        case "Currency": return "Currencies";
        default: return type;
    }
}

/**
  * Включить/выключить CSS класс для элемента по условию
  * @param {object} element - HTML элемент
  * @param {string} className - Название класса
  * @param {boolean} condition - Условие, при выполнении которого класс будет применён
  */
function setClassIf(element, className, condition) {
    if (!condition && element.classList.contains(className)) {
        element.classList.remove(className);
    }
    else if (condition && !element.classList.contains(className)) {
        element.classList.add(className);
    }
}

/**
 * Преобразовать строку к "безопасному" виду, содержащему только A-Z, a-z, 0-9, -, _
 * @param {string} text 
 */
function convertToSlug(text) {
    return text
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '_');
}

// #endregion

// #region Tabs

/**
  * Создать новую вкладку по шаблону
  * @param {string} tabTemplateId - Идентификатор шаблона вкладки
  * @param {string} tabPaneTemplateId - Идентификатор шаблона содержимого
  * @param {string} title - Заголовок вкладки
  * @param {string} href - Идентификатор вкладки
  */
function createTab(tabTemplateId, tabPaneTemplateId, title, href) {
    if (!href) { href = title.toLocaleLowerCase(); }

    // Добавляем вкладку
    const tab = document.getElementById(tabTemplateId).content.firstElementChild.cloneNode(true);
    const link = tab.querySelector("a");
    link.textContent = title;
    link.id = `${href}-tab`;
    link.href = `#${href}`;
    link.setAttribute("aria-controls", `${href}`);

    // Добавляем содержимое вкладки
    const tabPane = document.getElementById(tabPaneTemplateId).content.firstElementChild.cloneNode(true);
    tabPane.id = `${href}`;
    tabPane.setAttribute("aria-labelledby", `${href}-tab`);

    return { tab, tabPane };
}

/**
  * Закрыть вкладку
  * @param {string} href - Идентификатор вкладки
  */
function closeTab(href) {
    const tab = document.querySelector(`.nav-item a[href="#${href}"]`).closest(".nav-item");
    const tabPane = document.getElementById(href);
    const navTabs = tab.closest(".nav-tabs");
    tabPane.remove();
    tab.remove();
    // Если была закрыта активная вкладка
    if (!navTabs.querySelector(".nav-link[aria-selected='true'")) {
        // Открываем вкладку по-умолчанию
        const defaultTabId = navTabs.querySelector(".nav-link[data-default='true']").id
        $(`#${defaultTabId}`).tab('show')
    }
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

    // Открываем вкладку по-умолчанию
    const defaultTabId = document.querySelector("#main-nav .nav-link[data-default='true']").id
    $(`#${defaultTabId}`).tab('show')

    // Загружаем новые позиции и обновляем таблицу
    loopLoadPortfolio();

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

    // Загружаем сделки по инструменту
    TTApi.loadFillsByTicker(ticker)
        .then(_ => TTApi.loadOrderbookByTicker(ticker))
        .then(_ => {
            addPositionInput.value = "";
            $('#add-position-modal').modal('hide');
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

    DrawSystemOperations(TTApi.operations[undefined]);

    $('#filter-operations-modal').modal('hide');
});

// #endregion

// #region Settings

const webTerminalCheckbox = document.querySelector("#webTerminalCheckbox");
webTerminalCheckbox.checked = (localStorage["overrideAveragePriceOnWebTerminal"] === "true");
webTerminalCheckbox.addEventListener("change", (e) => {
    localStorage["overrideAveragePriceOnWebTerminal"] = e.target.checked;
});


const updateIntervalInput = document.querySelector("#updateIntervalInput");
updateIntervalInput.value = updateIntervalTimeout / 1000;
updateIntervalInput.addEventListener("change", (e) => {
    updateIntervalTimeout = e.target.value * 1000;
    localStorage["positionsUpdateIntervalInput"] = updateIntervalTimeout;
    console.log(`Positions update interval changed. New value: ${updateIntervalTimeout} ms`)
    loopLoadPortfolio();
});

// #endregion
