/**
 * @typedef Instrument
 * @property {string} ticker - короткий идентификатор инструмента
 * @property {string} figi - идентификатор инструмента FIGI (Financial Instrument Global Identifier)
 * @property {string} isin - идентификатор ISIN (International Securities Identification Number)
 * @property {string?} classCode - класс-код инструмента
 * @property {string?} exchange - торговая площадка
 * @property {string} name - название инструмента
 * @property {import("../types").Currency} currency - валюта инструмента (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY)
 * @property {import("../types").InstrumentType} type - тип инструмента (Stock, Bond, Etf, Currency)
 * @property {number} lot - размер лота
 * @property {number} minPriceIncrement - шаг цены инструмента
 * @property {string} logo - логотип
 * Дополнительные свойства:
 * @property {string?} isoCurrencyName - название валюты в формате ISO (только для валютных инструментов)
 * @property {object?} candles - свечи
 */

export {};
