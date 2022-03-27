/**
 * @typedef PortfolioPositionDto
 *
 * @property {string} figi - Figi-идентификатора инструмента
 * @property {import("./Instrument").InstrumentType} instrumentType - Тип инструмента
 * @property {import("./Quotation").Quotation} quantity - Количество инструмента в портфеле в штуках
 * @property {import("./MoneyValue").MoneyValue} averagePositionPrice - Средневзвешенная цена позиции. Возможна задержка до секунды для пересчёта.
 * @property {import("./Quotation").Quotation} expectedYield - Текущая рассчитанная относительная доходность позиции, в %.
 * @property {import("./MoneyValue").MoneyValue} currentNkd - Текущий НКД
 * @property {import("./Quotation").Quotation} averagePositionPricePt - Средняя цена лота в позиции в пунктах (для фьючерсов). Возможна задержка до секунды для пересчёта.
 * @property {import("./MoneyValue").MoneyValue} currentPrice - Текущая цена инструмента
 * @property {import("./MoneyValue").MoneyValue} averagePositionPriceFifo - Средняя цена лота в позиции по методу FIFO. Возможна задержка до секунды для пересчёта.
 * @property {import("./Quotation").Quotation} quantityLots - Количество лотов в портфеле
 */

export {};
