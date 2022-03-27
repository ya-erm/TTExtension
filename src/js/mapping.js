// @ts-check

import { printOperationType } from "./utils.js";

/**
 * Преобразование к числовому значению
 * @param {import("./types.js").Quotation} quotation
 * @returns {number}
 */
export function toNumber(quotation) {
    if (!quotation) return null;
    const units = quotation.units.startsWith("-")
        ? quotation.units.substring(1)
        : quotation.units;
    const nano = Math.abs(quotation.nano);
    const negative = quotation.units.startsWith("-") || quotation.nano < 0;
    const result = (negative ? -1 : 1) * Number(`${units}.${nano}`);
    return result;
}

/**
 * Преобразование к числовому значению
 * @param {import("./types.js").MoneyValue} moneyValue
 * @returns {import("./types.js").Money}
 */
export function toMoney(moneyValue) {
    if (!moneyValue) return null;
    const currency = moneyValue.currency;
    const value = toNumber(moneyValue);
    return { currency, value };
}

/**
 * Конвертация OperationDto в Operation
 * @param {import("./types.js").OperationDto} dto
 * @param {string} account
 * @param {number?} commission
 * @returns {import("./types.js").Operation}
 */
export function mapOperationDto(dto, account, commission) {
    return {
        id: dto.id,
        date: dto.date,
        figi: dto.figi,
        status: dto.state,
        operationType: dto.operationType,
        instrumentType: dto.instrumentType,
        currency: dto.currency,
        payment: toNumber(dto.payment),
        price: toNumber(dto.price),
        lotsRequested: dto.quantity,
        lotsExecuted: dto.quantity - dto.quantityRest,
        commission: commission,
        trades: dto.trades,
        account: account,
    };
}

/**
 * Конвертация InstrumentDto в Instrument
 * @param {import("./types.js").InstrumentDto} dto
 * @returns {import("./types.js").Instrument}
 */
export function mapInstrumentDto(dto) {
    return {
        ticker: dto.ticker,
        figi: dto.figi,
        isin: dto.isin,
        name: dto.name,
        classCode: dto.classCode,
        exchange: dto.exchange,
        currency: dto.currency,
        type: dto.instrumentType,
        lot: dto.lot,
        minPriceIncrement: toNumber(dto.minPriceIncrement),
        candles: undefined,
    };
}

/**
 * Конвертация PortfolioPositionDto в PortfolioPosition
 * @param {import("./types.js").PortfolioPositionDto} dto
 * @returns {import("./types.js").PortfolioPosition}
 */
export function mapPortfolioPositionDto(dto) {
    return {
        figi: dto.figi,
        instrumentType: dto.instrumentType,
        quantity: toNumber(dto.quantity),
        quantityLots: toNumber(dto.quantityLots),
        averagePositionPrice: toNumber(dto.averagePositionPrice),
        averagePositionPricePt: toNumber(dto.averagePositionPricePt),
        averagePositionPriceFifo: toNumber(dto.averagePositionPriceFifo),
        expectedYield: toNumber(dto.expectedYield),
        currentPrice: toNumber(dto.currentPrice),
        currentNkd: toNumber(dto.currentNkd),
        currency:
            dto.averagePositionPrice?.currency ?? dto.currentPrice?.currency,
    };
}

/**
 * Конвертация HistoricCandleDto в HistoricCandle
 * @param {import("./types.js").HistoricCandleDto} dto
 * @param {import("./types.js").CandleInterval} interval
 * @param {string} figi
 * @returns {import("./types.js").Candle}
 */
export function mapHistoricCandleDto(dto, interval, figi) {
    return {
        o: toNumber(dto.open),
        c: toNumber(dto.close),
        h: toNumber(dto.high),
        l: toNumber(dto.low),
        v: dto.volume,
        time: dto.time,
        interval,
        figi,
    };
}

/**
 * Конвертация CandleInterval в HistoricCandleInterval
 * @param {import("./types.js").CandleInterval} interval
 * @returns {import("./types.js").HistoricCandleInterval}
 */
export function mapCandleInterval(interval) {
    switch (interval) {
        case "1min":
            return "CANDLE_INTERVAL_1_MIN";
        case "5min":
            return "CANDLE_INTERVAL_5_MIN";
        case "15min":
            return "CANDLE_INTERVAL_15_MIN";
        case "hour":
            return "CANDLE_INTERVAL_DAY";
        case "day":
            return "CANDLE_INTERVAL_DAY";
    }
}

/**
 * Краткое текстовое представление типа операции
 * @param {import("./types.js").OperationType} operationType
 */
export function mapOperationType(operationType) {
    switch (operationType) {
        case "OPERATION_TYPE_BUY":
        case "OPERATION_TYPE_BUY_CARD":
            return "Buy";
        case "OPERATION_TYPE_SELL":
        case "OPERATION_TYPE_SELL_CARD":
            return "Sell";
        default:
            return printOperationType(operationType);
    }
}
/**
 * Конвертация типа заявки в текстовое представление
 * @param {import("./types.js").OrderType} type Тип заявки
 */
export function mapOrderType(type) {
    switch (type) {
        case "ORDER_TYPE_LIMIT":
            return "Limit";
        case "ORDER_TYPE_MARKET":
            return "Market";
        case "ORDER_TYPE_UNSPECIFIED":
            return "Unknown";
    }
}

/**
 * Конвертация направления заявки в текстовое представление
 * @param {import("./types.js").OrderDirection} direction Направление заявки
 */
export function mapOrderDirection(direction) {
    switch (direction) {
        case "ORDER_DIRECTION_BUY":
            return "Buy";
        case "ORDER_DIRECTION_SELL":
            return "Sell";
        case "ORDER_DIRECTION_UNSPECIFIED":
            return "Unknown";
    }
}
