/**
 * @typedef Operation
 * @property {string} id - идентификатор сделки
 * @property {string} date - дата и время в ISO8601, например "2021-02-10T11:18:27.276+03:00"
 * @property {string?} figi - идентификатор инструмента FIGI
 * @property {import('../types.js').OperationState} status - статус заявки, например "Done"
 * @property {import('../types.js').OperationType} operationType - тип операции, например "Buy"
 * @property {import('../types.js').InstrumentType?} instrumentType - тип инструмента (Stock, Currency, Bond, Etf)
 * @property {import('../types.js').Currency} currency - валюта инструмента (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY)
 * @property {number} payment - сумма платежа, с учётом знака -200.42
 * @property {number?} price - стоимость одного лота, например 100.21
 * @property {number?} lotsRequested - количество лотов в заявке
 * @property {number?} lotsExecuted - количество исполненных лотов
 * @property {number?} commission - комиссия
 * @property {import('../types.js').Trade[]?} trades - массив биржевых сделок
 * Дополнительные свойства:
 * @property {string} account - идентификатор счёта
 */

export {};
