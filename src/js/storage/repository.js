// @ts-check
import { useReadTransaction, useWriteTransaction } from './database.js'

/** 
 * Базовый класс хранилища сущностей
 * @abstract
 * @template T - тип объекта
 */
export class Repository {
    /**
     * @constructor
     * @param { import("./database.js").DataBaseParams } dbParams - параметры подключения к базе данных
     */
    constructor(dbParams) {
        this.dbParams = dbParams;
    }

    /**
     * Сохранить элемент в БД
     * @param {T} item - элемент 
     * @returns {Promise<void>}
     */
    async putOne(item) {
        return await useWriteTransaction(this.dbParams, objectStore => objectStore.put(item));
    }

    /**
     * Сохранить список элементов в БД
     * @param {T[]} items - список элементов
     * @returns {Promise<void>}
     */
    async putMany(items) {
        return await useWriteTransaction(this.dbParams, objectStore => {
            items.forEach(item => {
                objectStore.put(item);
            });
        });
    }

    /**
     * Получить элемент по идентификатору
     * @param {string} id - идентификатор
     * @returns {Promise<T>}
     */
    async getOne(id) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.get(id));
    }

    /**
     * Получить все элементы хранилища
     * @returns {Promise<T[]>}
     */
    async getAll() {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.getAll());
    }

    /**
     * Удалить элемент по идентификатору
     * @param {string} id - идентификатор элемента
     * @returns {Promise<void>}
     */
    async deleteOne(id) {
        return await useWriteTransaction(this.dbParams, objectStore => objectStore.delete(id));
    }

    /**
     * Удалить базу данных
     */
    async dropDatabase() {
        indexedDB.deleteDatabase(this.dbParams.dbName);
    }
}
