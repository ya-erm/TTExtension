function FindCell(table, row, title) {
    var cellIndex = -1;
    let headerCells = table.querySelectorAll('th');
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
  */
function SetAvgPrice(asset, price) {
    let portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    let row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    let avgCell = FindCell(portfolioTable, row, "Средняя");
    if (avgCell == null) { return; }

    let currency = avgCell.textContent.split(' ')[1];
    avgCell.textContent = `${price.toFixed(2)} ${currency}`;
}

/**
  * Рассчитать незафиксированную прибыль:  
  * (текущая цена - средняя цена) * количество
  * @param {string} asset - Название инструмента
  */
function CalculateProfit(asset) {
    let portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    let row = portfolioTable.querySelector(`[data-symbol-id="${asset}"]`);

    let avgCell = FindCell(portfolioTable, row, "Средняя");
    let priceCell = FindCell(portfolioTable, row, "Цена");
    let countCell = FindCell(portfolioTable, row, "Всего");
    if (avgCell == null || priceCell == null || countCell == null) { return; }

    let currency = avgCell.textContent.split(' ')[1];

    avgPrice = Number(avgCell.textContent.split(' ')[0].replace(',','.'));
    curPrice = Number(priceCell.textContent.split(' ')[0].replace(',','.'));
    count = Number(countCell.textContent);

    let profit = (curPrice - avgPrice) * count;

    let profitCell = FindCell(portfolioTable, row, "Доход");
    if (profitCell == null) { return; }
    
    profitCell.textContent = `${profit.toFixed(2)} ${currency}`;
    profitCell.className = profit > 0 ? "profit" : "loss";
    
    let profitPercentsCell = FindCell(portfolioTable, row, "Доход, %");
    if (profitPercentsCell == null) { return; }

    let profitPercents = 100 * profit / (avgPrice * count);
    profitPercentsCell.textContent = `${profitPercents.toFixed(2)} %`;
    profitPercentsCell.className = profitPercents > 0 ? "profit" : "loss";
}


function AppendFixedPnLColumn() {
    let portfolioTable = document.querySelector('[data-widget-type="PORTFOLIO_WIDGET"]');
    let headerRow = portfolioTable.querySelector('thead tr');

    let headerCells = portfolioTable.querySelectorAll('th');
    headerCells.forEach(element => {
        if (element.textContent == "Fixed P&L") {
            return;
        }
    });

    let fixedPnLHeaderCell = document.createElement('th');
    fixedPnLHeaderCell.innerHTML = '<div class="th">Fixed P&L</div>';
    headerRow.appendChild(fixedPnLHeaderCell);
}


export { SetAvgPrice, CalculateProfit };