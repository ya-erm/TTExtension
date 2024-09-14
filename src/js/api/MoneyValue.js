/**
 * @typedef MoneyValue
 *
 * @property {Currency} currency - Строковый ISO-код валюты
 * @property {string} units - Целая часть суммы, может быть отрицательным числом
 * @property {number} nano - Дробная часть суммы, может быть отрицательным числом
 */

/**
 * @typedef {('rub' | 'usd' | 'eur' )} Currency - Валюта
 */

/**
 * @typedef Money
 * @property {Currency} currency - Строковый ISO-код валюты
 * @property {number} value - Значение
 */

export {};
