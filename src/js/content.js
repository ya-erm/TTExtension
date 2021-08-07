/* Этот скрипт выполняется на разрешённых страницах */

// Обработчик обновлений позиции
function handlePositionsUpdate(positions) {
    if (!!positions) {
        console.log("Updating positions average price from TTExtension");
        positions.forEach(position => {
            try {
                window.TTWebApi.setAvgPrice(position.ticker, position.average, position.currency);
                window.TTWebApi.calculateProfit(position.ticker, position.currency);
            }
            catch (exception) {
                console.log(`Error was occurred while processing position ${position}`);
                console.log(exception);
            }
        });
    }
}

if (document.URL.startsWith("https://www.tinkoff.ru/invest-terminal")) {
    // Каждые 5 секунд запрашиваем список позиций из расширения
    setInterval(() => {
        chrome.runtime.sendMessage({ type: "GetPositions" }, handlePositionsUpdate);
    }, 5000);
}


/* TTWebApi */

if (!window.TTWebApi) { window.TTWebApi = {}; }

window.TTWebApi = {
    ...window.TTWebApi,
    setAvgPrice,
    calculateProfit,
}

// Поиск ячейки в таблице по заголовку столбца
function findCell(table, row, title) {
    var cellIndex = -1;
    const headerCells = table.querySelectorAll('th');
    for (var i = 0; i < headerCells.length; i++) {
        if (headerCells[i].textContent == title) {
            cellIndex = i;
            break;
        }
    }
    if (cellIndex == -1) {
        console.error(`Failed to find cell of column ${title}`);
        return null;
    }

    return row.querySelector(`td:nth-child(${cellIndex + 1})`);
}

/**
  * Установить среднюю цены для инструмента
  * @param {string} asset - Название инструмента
  * @param {number} price - Средняя цена
  * @param {string} currency - Валюта
  */
function setAvgPrice(asset, price, currency) {
    const portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    const row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    if (row == undefined) { return; }

    const avgCell = findCell(portfolioTable, row, "Средняя");
    if (avgCell == null || price == undefined) { return; }

    avgCell.textContent = printMoney(price, currency);
}

/**
  * Рассчитать незафиксированную прибыль:  
  * (текущая цена - средняя цена) * количество
  * @param {string} asset - Название инструмента
  * @param {string} currency - Валюта
  */
function calculateProfit(asset, currency) {
    const portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    const row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    if (row == undefined) { return; }

    const avgCell = findCell(portfolioTable, row, "Средняя");
    const priceCell = findCell(portfolioTable, row, "Цена");
    const countCell = findCell(portfolioTable, row, "Всего");
    if (avgCell == null || priceCell == null || countCell == null) { return; }

    const avgPrice = Number.parseFloat(avgCell.textContent.replace(',', '.').replace(' ', ''));
    const curPrice = Number.parseFloat(priceCell.textContent.replace(',', '.').replace(' ', ''));
    const count = Number(countCell.textContent);

    const profit = (curPrice - avgPrice) * count;

    const profitCell = findCell(portfolioTable, row, "Доход").querySelector("div");
    if (profitCell != null) {
        profitCell.textContent = printMoney(profit, currency);
        setClassIf(profitCell, "profit", profit > 0);
        setClassIf(profitCell, "loss", profit < 0);
    }

    const profitPercentsCell = findCell(portfolioTable, row, "Доход, %").querySelector("div");
    if (profitPercentsCell != null) {
        const profitPercents = 100 * profit / (avgPrice * Math.abs(count));
        profitPercentsCell.textContent = printMoney(profitPercents, '%');
        setClassIf(profitPercentsCell, "profit", profitPercents > 0);
        setClassIf(profitPercentsCell, "loss", profitPercents < 0);
    }
}

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