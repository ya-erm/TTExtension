/**
 * @typedef Candle
 * 
 * @property {number} o - Цена открытия за 1 инструмент
 * @property {number} c - Цена закрытия за 1 инструмент
 * @property {number} h - Максимальная цена за 1 инструмент
 * @property {number} l - Минимальная цена за 1 инструмент
 * @property {number} v - Объём торгов в штуках
 * @property {import("../types").Timestamp} time - Время свечи в часовом поясе UTC
 * @property {CandleInterval} interval - интервал
 * @property {string} figi - идентификатор инструмента
 */

/**
 * @typedef {('1min' |'5min' |'15min' |'hour' |'day')} CandleInterval
 */


export {}
