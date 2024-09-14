/**
 * @typedef HistoricCandleDto
 * 
 * @property {import("./Quotation").Quotation} open - Цена открытия за 1 инструмент.
 * @property {import("./Quotation").Quotation} high - Максимальная цена за 1 инструмент.
 * @property {import("./Quotation").Quotation} low - Минимальная цена за 1 инструмент.
 * @property {import("./Quotation").Quotation} close - Цена закрытия за 1 инструмент.
 * @property {number} volume - Объём торгов в штуках.
 * @property {import("./Timestamp").Timestamp} time - Время свечи в часовом поясе UTC.
 * @property {boolean} isComplete - Признак завершённости свечи. false значит, свеча за текущие интервал ещё сформирована не полностью.
 */

/**
 * @typedef {(
 *  'CANDLE_INTERVAL_UNSPECIFIED' |
 *  'CANDLE_INTERVAL_1_MIN' |
 *  'CANDLE_INTERVAL_5_MIN' |
 *  'CANDLE_INTERVAL_15_MIN' |
 *  'CANDLE_INTERVAL_HOUR' |
 *  'CANDLE_INTERVAL_DAY'
 * )} HistoricCandleInterval
 */

export {}
