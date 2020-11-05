export class Position {
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
