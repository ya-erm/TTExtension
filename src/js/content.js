/* Этот скрипт выполняется на разрешённых страницах */

// Обработчик обновлений позиции
var HandlePositionsUpdate = (positions) => {
    console.log("Updating positions average price from TTExtension");
    positions?.forEach(position => {
        try {
            window.TTWebApi.SetAvgPrice(position.ticker, position.average, position.currency);
            window.TTWebApi.CalculateProfit(position.ticker, position.currency);
        }
        catch (exception) {
            console.log(`Error was occurred while processing position ${position}`);
            console.log(exception);
        }
    });
}

// Каждые 5 секунд запрашиваем список позиций из расширения
setInterval(() => {
    chrome.runtime.sendMessage({ type: "GetPositions" }, HandlePositionsUpdate);
}, 5000);



/* TTWebApi */

if (!window.TTWebApi) { window.TTWebApi = {}; }

window.TTWebApi = {
    ...window.TTWebApi,
    SetAvgPrice,
    CalculateProfit,
}

// Поиск ячейки в таблице по заголовку столбца
function FindCell(table, row, title) {
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
function SetAvgPrice(asset, price, currency) {
    const portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    const row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    if (row == undefined) { return; }

    const avgCell = FindCell(portfolioTable, row, "Средняя");
    if (avgCell == null) { return; }

    avgCell.textContent = printMoney(price, currency);
}

/**
  * Рассчитать незафиксированную прибыль:  
  * (текущая цена - средняя цена) * количество
  * @param {string} asset - Название инструмента
  * @param {string} currency - Валюта
  */
function CalculateProfit(asset, currency) {
    const portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    const row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    if (row == undefined) { return; }

    const avgCell = FindCell(portfolioTable, row, "Средняя");
    const priceCell = FindCell(portfolioTable, row, "Цена");
    const countCell = FindCell(portfolioTable, row, "Всего");
    if (avgCell == null || priceCell == null || countCell == null) { return; }

    const avgPrice = Number(avgCell.textContent.split(' ')[0].replace(',', '.'));
    const curPrice = Number(priceCell.textContent.split(' ')[0].replace(',', '.'));
    const count = Number(countCell.textContent);

    const profit = (curPrice - avgPrice) * count;

    const profitCell = FindCell(portfolioTable, row, "Доход");
    if (profitCell == null) { return; }

    profitCell.textContent = printMoney(profit, currency);
    profitCell.className = profit > 0 ? "profit" : "loss";

    const profitPercentsCell = FindCell(portfolioTable, row, "Доход, %");
    if (profitPercentsCell == null) { return; }

    const profitPercents = 100 * profit / (avgPrice * count);
    profitPercentsCell.textContent = printMoney(profitPercents, '%');
    profitPercentsCell.className = profitPercents > 0 ? "profit" : "loss";
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
