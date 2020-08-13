if (!window.TTApi) { window.TTApi = {}; }

const eraseButton = document.getElementById("erase-button");
eraseButton.addEventListener("click", () => {
    // Очищаем хранилище и страницу
    localStorage.clear();
    document.getElementById("token-input").value = "";
    $("#portfolio-table tbody").children().remove();
    $(".nav-item[data-closable='true']").remove();
    document.querySelector(".portfolio-total-cost").innerHTML = "";
    window.TTApi.erase();
    // Скрываем кнопку очистки хранилища
    setClassIf(eraseButton, "d-none", true);
});

// Загружаем токен из localStorage
const token = localStorage["token"];
let updateIntervalTimeout = localStorage["positionsUpdateIntervalInput"] || 60 * 1000;
let positionsUpdateTimerId;

if (token) {
    window.TTApi.token = token;
    document.getElementById("token-input").value = token;

    // Отображаем позиции из памяти
    window.TTApi.positions.forEach(position => AddPositionRow(position))
    AddPositionSummaryRow(window.TTApi.positions);

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
    AddPositionSummaryRow(window.TTApi.positions);
});

// Обработчик события удаления позиции
window.addEventListener("PositionRemoved", function (event) {
    const { position } = event.detail;
    document.querySelector(`#position-${position.figi}`)?.remove();
    AddPositionSummaryRow(window.TTApi.positions);
});

// Загрузка портфеля
function loadPortfolio() {
    window.TTApi.LoadPortfolio()
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
        AddPositionRow(position);
    } else {
        FillPositionRow(positionRow, position);
    }
}

/**
  * Создать новую строку в таблице позиций
  * @param {object} position - позиция
  */
function AddPositionRow(position) {
    const positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = `position-${position.figi}`;

    const cellAsset = positionRow.querySelector("td.portfolio-asset");
    cellAsset.querySelector("a").href = "https://www.tinkoff.ru/invest/" + position.instrumentType.toLowerCase() + "s/" + position.ticker;
    cellAsset.querySelector("a").title = cellAsset.querySelector("a").href;
    cellAsset.querySelector("span").textContent = position.instrumentType === "Stock"
        ? position.ticker + ' - ' + position.name
        : position.name;
    cellAsset.querySelector(".portfolio-logo").style["backgroundImage"] = `url("https://static.tinkoff.ru/brands/traiding/${position.isin}x160.png")`;

    FillPositionRow(positionRow, position);

    const tbody = document.querySelector(`#portfolio-table tbody.positions-${position.instrumentType.toLowerCase()}`);
    if (!tbody.querySelector(".group-row")) {
        const groupRow = document.querySelector('#portfolio-group-row-template').content.firstElementChild.cloneNode(true);
        groupRow.querySelector("td").textContent = mapInstrumentType(position.instrumentType);
        tbody.appendChild(groupRow);
    }
    tbody.appendChild(positionRow);

    positionRow.addEventListener("click", () => OnPositionClick(position));
}

/**
  * Заполнить строку в таблице позиций данными
  * @param {object} positionRow - строка таблицы
  * @param {object} position - позиция
  */
function FillPositionRow(positionRow, position) {
    if (position.count == 0) {
        if (!positionRow.querySelector(".portfolio-asset-button-remove")) {
            const buttonRemove = document.querySelector("#portfolio-asset-button-remove-template").content.firstElementChild.cloneNode(true);
            buttonRemove.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                OnPositionRemoveClick(position);
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
    cellFixedPnL.textContent = printMoney(position.fixedPnL, position.currency, true);
    cellFixedPnL.className = getMoneyColorClass(position.fixedPnL);
}

/**
  * Получить курс валюты
  * @param {string} from - из какой валюты
  * @param {string} to - в какую валюту
  */
function GetCurrencyRate(from, to) {
    const usdToRub = window.TTApi.positions.find(_ => _.figi == "BBG0013HGFT4")?.lastPrice; // Доллар США
    if (from == "USD" && to == "RUB") {
        return usdToRub;
    } else if (from == "RUB" && to == "USD") {
        return 1.0 / usdToRub;
    }

    const eurToRub = window.TTApi.positions.find(_ => _.figi == "BBG0013HJJ31")?.lastPrice; // Евро
    if (from == "EUR" && to == "RUB") {
        return eurToRub;
    } else if (from == "RUB" && to == "EUR") {
        return 1.0 / eurToRub;
    }
}

// Добавить итоговую строку по позициям
function AddPositionSummaryRow(positions) {
    let positionRow = document.getElementById("position-summary");
    if (positionRow) { positionRow.remove(); }

    positionRow = document.querySelector('#portfolio-row-template').content.firstElementChild.cloneNode(true);
    positionRow.id = "position-summary";

    const total = positions.reduce((result, position) => {
        result.cost[position.currency] = (position.count || 0) * (position.average || 0) + (position.expected || 0) + (result.cost[position.currency] || 0);
        result.expected[position.currency] = (position.expected || 0) + (result.expected[position.currency] || 0);
        result.fixedPnL[position.currency] = (position.fixedPnL || 0) + (result.fixedPnL[position.currency] || 0);
        return result;
    }, { cost: {}, expected: {}, fixedPnL: {} });

    const selectedCurrency = localStorage["selectedCurrency"] || "RUB";

    let totalCostTitle = "Portfolio cost now \n";
    const totalCost = Object.keys(total.expected).reduce((result, key) => {
        totalCostTitle += `${key}: ${printMoney(total.cost[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : GetCurrencyRate(key, selectedCurrency)) * total.cost[key];
    }, 0);

    let totalExpectedTitle = "Total expected \n";
    const totalExpected = Object.keys(total.expected).reduce((result, key) => {
        totalExpectedTitle += `${key}: ${printMoney(total.expected[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : GetCurrencyRate(key, selectedCurrency)) * total.expected[key];
    }, 0);

    let totalFixedPnLTitle = "Total fixed P&L \n";
    const totalFixedPnL = Object.keys(total.fixedPnL).reduce((result, key) => {
        totalFixedPnLTitle += `${key}: ${printMoney(total.fixedPnL[key], key)}\n`;
        return result + (key == selectedCurrency ? 1.0 : GetCurrencyRate(key, selectedCurrency)) * total.fixedPnL[key];
    }, 0);

    const cellExpected = positionRow.querySelector("td.portfolio-expected span");
    cellExpected.textContent = printMoney(totalExpected, selectedCurrency, true);
    cellExpected.className = getMoneyColorClass(totalExpected);
    cellExpected.title = totalExpectedTitle;
    cellExpected.addEventListener('click', _ => ChangeSelectedCurrency(selectedCurrency));

    const cellFixedPnL = positionRow.querySelector("td.portfolio-fixed-pnl span");
    cellFixedPnL.textContent = printMoney(totalFixedPnL, selectedCurrency, true);
    cellFixedPnL.className = getMoneyColorClass(totalFixedPnL);
    cellFixedPnL.title = totalFixedPnLTitle;
    cellFixedPnL.addEventListener('click', _ => ChangeSelectedCurrency(selectedCurrency));

    positionRow.querySelector("td.portfolio-asset").innerHTML = "";

    const tbody = document.querySelector("#portfolio-table tbody.positions-summary-row");
    tbody.appendChild(positionRow);

    const totalCostSpan = document.querySelector(".portfolio-total-cost");
    const oldTotalCost = parseFloat(totalCostSpan.innerHTML.replace(/ /g, ''));
    totalCostSpan.innerHTML = printMoney(totalCost, selectedCurrency);
    totalCostSpan.title = totalCostTitle;
    totalCostSpan.addEventListener('click', _ => ChangeSelectedCurrency(selectedCurrency));

    if (oldTotalCost && Math.abs(totalCost - oldTotalCost) > 0.01) {
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
function ChangeSelectedCurrency(selectedCurrency) {
    if (selectedCurrency == "RUB") {
        selectedCurrency = "USD";
    } else {
        selectedCurrency = "RUB";
    }
    localStorage.setItem("selectedCurrency", selectedCurrency);
    AddPositionSummaryRow(window.TTApi.positions);
};

// Обработчик нажатия на строку в таблице позиций
function OnPositionClick(position) {
    const ticker = position.ticker;
    const mainNav = document.querySelector("#main-nav");
    // Если вкладка не существует
    if (!mainNav.querySelector(`#${ticker}-tab`)) {
        // Создаём и добавляем вкладку
        const mainTabContent = document.querySelector("#main-tab-content");
        const { tab, tabPane } = CreateTab("nav-tab-template", "tab-pane-fills-template", ticker, ticker);
        mainNav.appendChild(tab);
        mainTabContent.appendChild(tabPane);

        tab.querySelector(".tab-close-button").addEventListener('click', () => CloseTab(ticker));

        // Отображаем сделки из памяти
        if (window.TTApi.fills[position.ticker]) {
            DrawOperations(position, window.TTApi.fills[position.ticker]);
        }

        // Загружаем новые сделки и обновляем таблицу
        window.TTApi.LoadFillsByFigi(position.figi)
            .then((fills) => DrawOperations(position, fills));
    }
    // Открываем вкладку
    $(`#${ticker}-tab`).tab('show');

}

// Обработчик нажатия на кнопку удаления позиции
function OnPositionRemoveClick(position) {
    window.TTApi.RemovePosition(position);
}

// #endregion

// #region Operations

function DrawOperations(position, fills) {
    const tbody = document.querySelector(`#${position.ticker} table tbody`)
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

// #endregion

// #region Tabs

/**
  * Создать новую вкладку по шаблону
  * @param {string} tabTemplateId - Идентификатор шаблона вкладки
  * @param {string} tabPaneTemplateId - Идентификатор шаблона содержимого
  * @param {string} title - Заголовок вкладки
  * @param {string} href - Идентификатор вкладки
  */
function CreateTab(tabTemplateId, tabPaneTemplateId, title, href) {
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
function CloseTab(href) {
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
    localStorage["token"] = token;
    window.TTApi.token = token;

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
    window.TTApi.LoadFillsByTicker(ticker)
        .then(_ => window.TTApi.LoadOrderbookByTicker(ticker))
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
