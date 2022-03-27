// @ts-check
import { useReadTransaction, useReadTransactionMany } from './database.js';
import { Repository } from "./repository.js";

/** @typedef {import('../types').Fill} Fill */

/** Название хранилища в базе данных */
const storeName = "fills";

/**
 * Хранилище сделок
 * @extends {Repository<Fill>}
 */
export class FillsRepository extends Repository {
    /**
     * @param {string} portfolioId - идентификатор счёта
     */
    constructor(portfolioId) {
        super({
            dbName: "fills",
            dbVersion: 1,
            storeName,
            migrate: (openDbRequest, version) => {
                const db = openDbRequest.result;
                switch (version) {
                case 0: 
                    const fillsStore = db.createObjectStore(storeName, { keyPath: "id" });
                    fillsStore.createIndex("portfolioIdIndex", "portfolioId", { unique: false });
                    fillsStore.createIndex("portfolioIdFigiIndex", ["portfolioId", "figi"], { unique: false });
                    fillsStore.createIndex("portfolioIdTypeIndex", ["portfolioId", "operationType"], { unique: false });

                }
            }
        });
        this.portfolioId = portfolioId;
    }

    /**
     * Получить все сделки для указанного инструмента
     * @param {string} figi - идентификатор инструмента
     * @returns {Promise<Fill[]>}
     */
     async getAllByFigi(figi) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("portfolioIdFigiIndex").getAll([this.portfolioId, figi]));
    }

    /**
     * Получить все сделки указанного типа
     * @param {string} type - тип сделки
     * @returns {Promise<Fill[]>}
     */
    async getAllByType(type) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("portfolioIdTypeIndex").getAll([this.portfolioId, type]));
    }

    /**
     * Получить все сделки указанных типов
     * @param {string[]} types - массив типов сделок
     * @returns {Promise<Fill[]>}
     */
     async getAllByTypes(types) {
        /** @type {Fill[][]} */
        const results = await useReadTransactionMany(this.dbParams, objectStore =>
            types.map(type =>
                objectStore.index("portfolioIdTypeIndex").getAll([this.portfolioId, type])
            )
        );
        /** @type {Fill[]} */ // @ts-ignore
        return results.flat();
    }

    /**
     * @override
     * Получить все элементы хранилища
     * @returns {Promise<Fill[]>}
     */
    async getAll() {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("portfolioIdIndex").getAll(this.portfolioId));
    }

    /**
     * @override
     * Получить элемент по идентификатору
     * @param {string} id - идентификатор
     * @returns {Promise<Fill>}
     */
     async getOne(id) {
        const item = await super.getOne(id);
        return item.portfolioId == this.portfolioId ? item : undefined;
    }
}
/** Кэшированный список репозиториев */
const repositories = new Map();

/**
 * Получить хранилище сделок для указанного портфеля
 * @param {string} portfolioId - идентификатор портфеля
 * @returns {FillsRepository}
 */
export default function getFillsRepository(portfolioId) {
    if (repositories.has(portfolioId)) {
        return repositories.get(portfolioId);
    }
    const repository = new FillsRepository(portfolioId);
    repositories.set(portfolioId, repository);
    return repository;
}
