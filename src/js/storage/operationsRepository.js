import { useReadTransaction, useReadTransactionMany } from './database.js';
import { Repository } from './repository.js';

/**
 * @typedef Operation
 * @property {string} id - идентификатор сделки
 * @property {string} date - дата и время в ISO8601, например "2021-02-10T11:18:27.276+03:00"
 * @property {string} status - статус заявки, например "Done"
 * @property {string} operationType - тип операции, например "Buy"
 * @property {string} currency - валюта инструмента (RUB, USD, EUR, GBP, HKD, CHF, JPY, CNY, TRY)
 * @property {number} payment - сумма платежа, с учётом знака -200.42
 * @property {string?} figi - идентификатор инструмента FIGI
 * @property {string?} instrumentType - тип инструмента (Stock, Currency, Bond, Etf)
 * @property {number?} price - стоимость одного лота, например 100.21
 * @property {number?} quantity - количество лотов в заявке
 * @property {number?} quantityExecuted - количество исполненных лотов
 * @property {{currency: string, value: number}?} commission - комиссия, например {currency: "USD", value: -0.07}
 * @property {Array?} trades - массив биржевых сделок
 * Дополнительные свойства:
 * @property {string} account - идентификатор счёта
 */

/** Название хранилища в базе данных */
const storeName = "operations";

/**
 * Хранилище операций
 * @extends {Repository<Operation>}
 */
class OperationsRepository extends Repository {
    /**
     * @param {string} account - идентификатор счёта
     */
    constructor(account) {
        super({
            dbName: "operations",
            dbVersion: 3,
            storeName,
            migrate: (openDbRequest, version) => {
                const db = openDbRequest.result;
                switch (version) {
                    case 0: {
                        const operationsStore = db.createObjectStore(storeName, { keyPath: "id" });
                        operationsStore.createIndex("figiIndex", "figi", { unique: false });
                        operationsStore.createIndex("accountIndex", "account", { unique: false });
                        break;
                    }
                    case 1: {
                        const operationsStore = openDbRequest.transaction.objectStore(storeName);
                        operationsStore.createIndex("accountFigiIndex", ["account", "figi"], { unique: false });
                        break;
                    }
                    case 2: {
                        const operationsStore = openDbRequest.transaction.objectStore(storeName);
                        operationsStore.createIndex("accountTypeIndex", ["account", "operationType"], { unique: false });
                        break;
                    }
                }
            }
        });
        this.account = account;
    }

    /**
     * Получить все операции для указанного инструмента
     * @param {string} figi - идентификатор инструмента
     * @returns {Promise<Array<Operation>>}
     */
    async getAllByFigi(figi) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("accountFigiIndex").getAll([this.account, figi]));
    }

    /**
     * Получить все операции указанного типа
     * @param {string} type - тип операции
     * @returns {Promise<Array<Operation>>}
     */
    async getAllByType(type) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("accountTypeIndex").getAll([this.account, type]));
    }

    /**
     * Получить все операции указанных типов
     * @param {Array<string>} types - массив типов операций
     * @returns {Promise<Array<Operation>>}
     */
    async getAllByTypes(types) {
        /** @type {Array<Array<Operation>>} */
        const results = await useReadTransactionMany(this.dbParams, objectStore =>
            types.map(type =>
                objectStore.index("accountTypeIndex").getAll([this.account, type])
            )
        );
        /** @type {Array<Operation>} */
        return results.flat();
    }

    /**
     * @override
     * Получить все элементы хранилища
     * @returns {Promise<Array<Operation>>}
     */
    async getAll() {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("accountIndex").getAll(this.account));
    }

    /**
     * @override
     * Получить элемент по идентификатору
     * @param {string} id - идентификатор
     * @returns {Promise<Operation>}
     */
    async getOne(id) {
        const item = await super.getOne(id);
        return item.account == this.account ? item : undefined;
    }
}

/** Кэшированный список репозиториев */
const repositories = new Map();

/**
 * Получить хранилище операций для указанного счёта
 * @param {string} account - идентификатор счёта
 * @returns {OperationsRepository}
 */
export default function getOperationsRepository(account) {
    if (repositories.has(account)) {
        return repositories.get(account);
    }
    const repository = new OperationsRepository(account);
    repositories.set(account, repository);
    return repository;
}
