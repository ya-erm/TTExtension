// @ts-check
import { useReadTransaction, useReadTransactionMany } from "./database.js";
import { Repository } from "./repository.js";

/** @typedef {import('../types').Operation} Operation */

/** Название хранилища в базе данных */
const storeName = "operations";

/**
 * Хранилище операций
 * @extends {Repository<Operation>}
 */
export class OperationsRepository extends Repository {
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
     * @returns {Promise<Operation[]>}
     */
    async getAllByFigi(figi) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("accountFigiIndex").getAll([this.account, figi]));
    }

    /**
     * Получить все операции указанного типа
     * @param {string} type - тип операции
     * @returns {Promise<Operation[]>}
     */
    async getAllByType(type) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("accountTypeIndex").getAll([this.account, type]));
    }

    /**
     * Получить все операции указанных типов
     * @param {string[]} types - массив типов операций
     * @returns {Promise<Operation[]>}
     */
    async getAllByTypes(types) {
        /** @type {Operation[][]} */
        const results = await useReadTransactionMany(this.dbParams, objectStore =>
            types.map(type =>
                objectStore.index("accountTypeIndex").getAll([this.account, type])
            )
        );
        /** @type {Operation[]} */ // @ts-ignore
        return results.flat();
    }

    /**
     * @override
     * Получить все элементы хранилища
     * @returns {Promise<Operation[]>}
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
