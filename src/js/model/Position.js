// @ts-check

/**
 * @class Position
 */
export class Position {
    /**
     * @constructor
     * @param {string} portfolioId
     * @param {Partial<import("../types").PortfolioPosition>} item
     * @param {{ticker: string, isin: string, name: string, currency: import("../types").Currency}} instrument
     */
    constructor(portfolioId, item, instrument) {
        /** @type {string} короткий идентификатор */
        this.ticker = instrument?.ticker ?? item.figi;

        /** @type {string} полное название актива */
        this.name = instrument?.name ?? item.figi;

        /** @type {string} идентификатор FIGI (Financial Instrument Global Identifier) */
        this.figi = item.figi;

        /** @type {string} идентификатор ISIN (International Securities Identification Number) */
        this.isin = instrument?.isin;

        /** @type {import("../types").InstrumentType} тип (Stock, Currency, Bond, Etf) */
        this.instrumentType = item.instrumentType;

        /** @type {import("../types").Currency} валюта (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY) */
        this.currency = instrument?.currency ?? item.currency;

        /** @type {number} количество */
        this.count = item.quantity

        /** @type {number} количество лотов */
        this.lots = item.quantityLots

        /** @type {number?} средняя цена */
        this.average = item.averagePositionPrice;

        /** @type {number?} ожидаемая (незафиксированная) прибыль или убыток */
        this.expected = item.expectedYield;

        /** @type {number?} зафиксированная прибыль или убыток */
        this.fixedPnL = undefined;

        /** @type {number?} текущая цена (последняя известная цена) */
        this.lastPrice = item.currentPrice;
        // this.lastPrice = item.expectedYield / item.quantity + item.averagePositionPrice

        /** @type {Date?} дата последнего обновления цены */
        this.lastPriceUpdated = new Date();

        /** @type {string} идентификатор портфеля */
        this.portfolioId = portfolioId;

        /** @type {boolean} true, если требуется пересчёт позиции */
        this.needCalc = true;

        /** @type {number?} рассчитанная по сделкам средняя цена */
        this.calculatedAverage = undefined;

        /** @type {number?} рассчитанное по сделкам количество */
        this.calculatedCount = undefined;

        /** @type {number?} рассчитанная по сделкам ожидаемая прибыль*/
        this.calculatedExpected = undefined;

        /** @type {number?} цена инструмента на момент окончания предыдущего дня */
        this.previousDayPrice = undefined;

        /** @type {import("../types").Order[]} список активных заявок */
        this.orders = [];

        /** @type {boolean?} true, если тикер находится в избранном */
        this.isFavourite = false;
    }
}

/**
 * Обновить позицию
 * @param {Position} position - позиция
 * @param {number} average - средняя цена
 * @param {number} fixedPnL - зафиксированную прибыль
 */
export function updatePosition(position, average, fixedPnL) {
    position.calculatedAverage = average || position.calculatedAverage;
    position.fixedPnL = fixedPnL || position.fixedPnL;
    // position.expected = (position.lastPrice - position.average) * position.count;
    position.calculatedExpected =
        (position.lastPrice - position.calculatedAverage) *
        position.calculatedCount;
    position.needCalc = false;
    console.log(
        `Position ${position.ticker} updated`,
        `(average: ${average?.toFixed(2)}, fixedPnL: ${fixedPnL?.toFixed(2)})`
    );
    window.dispatchEvent(
        new CustomEvent("PositionUpdated", { detail: { position } })
    );
}
