import { instrumentsStoreName } from './instrumentsInit.js'
import { useReadTransaction, useWriteTransaction } from './database.js'

/**
 * @typedef Instrument
 * @property {string} ticker - короткий идентификатор инструмента
 * @property {string} figi - идентификатор инструмента FIGI (Financial Instrument Global Identifier)
 * @property {string} isin - идентификатор инструмента ISIN (International Securities Identification Number)
 * @property {string} name - название инструмента
 * @property {string} currency - валюта инструмента (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY)
 * @property {string} type - тип инструмента (Stock, Bond, Etf, Currency)
 * @property {number} lot - размер лота
 * @property {number} minPriceIncrement - шаг цены инструмента
 * @property {object} candles - рыночные данные
 */

/**
* Сохранить инструмент в БД
* @param {Instrument} instrument - инструмент
* @returns {Promise<void>}
*/
async function putOne(instrument) {
    return await useWriteTransaction(instrumentsStoreName, objectStore => objectStore.put(instrument));
}

/**
 * Сохранить список инструментов в БД
 * @param {Array<Instrument>} instruments - список инструментов
 * @returns {Promise<void>}
 */
async function putMany(instruments) {
    return await useWriteTransaction(instrumentsStoreName, objectStore => {
        instruments.forEach(item => {
            objectStore.put(item);
        });
    });
}

/**
 * Получить все инструменты
 * @returns {Promise<Array<Instrument>>}
 */
async function getAll() {
    return await useReadTransaction(instrumentsStoreName, objectStore => objectStore.getAll());
}

/**
 * Получить инструмент по тикеру
 * @param {string} ticker - идентификатор инструмента
 * @returns {Promise<Instrument>}
 */
async function getOne(ticker) {
    return await useReadTransaction(instrumentsStoreName, objectStore => objectStore.get(ticker));
}

/**
 * Получить инструмент по идентификатору FIGI
 * @param {string} figi - идентификатор инструмента
 * @returns {Promise<Instrument>}
 */
async function getOneByFigi(figi) {
    return await useReadTransaction(instrumentsStoreName, objectStore => objectStore.index("figiIndex").get(figi));
}

/**
 * Удалить инструмент по тикеру
 * @param {string} ticker - идентификатор инструмента
 * @returns {Promise<void>}
 */
async function deleteOne(ticker) {
    return await useWriteTransaction(instrumentsStoreName, objectStore => objectStore.delete(ticker));
}

const instrumentsRepository = {
    // Create, Update
    putOne,
    putMany,
    // Read
    getOne,
    getOneByTicker: getOne,
    getOneByFigi,
    getAll,
    // Delete
    deleteOne,
}

export default instrumentsRepository;

// For debug
window.instrumentsRepository = instrumentsRepository;
