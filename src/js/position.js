/**
 * @class Position
 * @property {string} ticker - короткий идентификатор
 * @property {string} figi - идентификатор FIGI (Financial Instrument Global Identifier)
 * @property {string} isin - идентификатор ISIN (International Securities Identification Number)
 * @property {string} name - полное название актива
 * @property {string} instrumentType - тип (Stock, Currency, Bond, Etf)
 * @property {string} currency - - валюта (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY)
 * @property {number} count - количество
 * @property {number?} average - средняя цена
 * @property {number?} expected - ожидаемая (незафиксированная) прибыль или убыток
 * @property {number?} fixedPnL - зафиксированная прибыль или убыток
 * @property {number?} average - средняя цена
 * @property {number?} lastPrice - текущая цена (последняя известная цена)
 * @property {Date?} lastPriceUpdated - дата последнего обновления цены
 * Дополнительные свойства:
 * @property {string} portfolioId - идентификатор портфеля
 * @property {boolean} needCalc - true, если требуется пересчёт позиции
 */
export class Position {
    /**
     * @constructor
     * @param {string} portfolioId 
     * @param {PortfolioPosition} item 
     */
    constructor(portfolioId, item) {
        this.ticker = item.ticker;
        this.name = item.name;
        this.figi = item.figi;
        this.isin = item.isin;
        this.count = item.balance;
        this.instrumentType = item.instrumentType;
        this.average = item.averagePositionPrice?.value;
        this.expected = item.expectedYield?.value;
        this.currency = item.averagePositionPrice?.currency || item.expectedYield?.currency;
        this.lastPrice = item.expectedYield?.value / item.balance + item.averagePositionPrice?.value;

        this.portfolioId = portfolioId;
        this.lastPriceUpdated = new Date();
        this.needCalc = true;
    }
}

/**
 * Обновить позицию
 * @param {number} average - средняя цена
 * @param {number} fixedPnL - зафиксированную прибыль
 */
export function updatePosition(position, average, fixedPnL) {
    position.average = average || position.average;
    position.fixedPnL = fixedPnL || position.fixedPnL;
    position.expected = (position.lastPrice - position.average) * position.count;
    position.needCalc = false;
    console.log(`Position ${position.ticker} updated (average: ${average?.toFixed(2)}, fixedPnL: ${fixedPnL?.toFixed(2)})`);
    window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
}
