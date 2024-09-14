
/**
 * @typedef PortfolioPosition
 *
 * @property {string} figi - Figi-идентификатора инструмента
 * @property {import("../types").InstrumentType} instrumentType - Тип инструмента
 * @property {number} quantity - Количество инструмента в портфеле в штуках
 * @property {number} quantityLots - Количество лотов в портфеле
 * @property {number?} averagePositionPrice - Средневзвешенная цена позиции. Возможна задержка до секунды для пересчёта.
 * @property {number?} averagePositionPricePt - Средняя цена лота в позиции в пунктах (для фьючерсов). Возможна задержка до секунды для пересчёта.
 * @property {number?} averagePositionPriceFifo - Средняя цена лота в позиции по методу FIFO. Возможна задержка до секунды для пересчёта.
 * @property {number?} expectedYield - Текущая рассчитанная относительная доходность позиции, в %.
 * @property {number?} currentPrice - Текущая цена инструмента
 * @property {number?} currentNkd - Текущий НКД
 * @property {import("../types").Currency?} currency - Валюта
 */

export {};
