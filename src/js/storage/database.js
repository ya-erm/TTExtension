/**
 * @typedef DataBaseParams
 * @property {string} dbName - название базы данных
 * @property {number} dbVersion - версия базы данных
 * @property {string} storeName - название хранилища в базе данных
 * @property {(request: IDBOpenDBRequest, version: number) => void} migrate - функция миграции
 */

/**
 * Использовать подключение к базе данных
 * @param {DataBaseParams} dbParams - параметры подключения
 * @returns {Promise<IDBDatabase>}
 */
export function useDbContext(dbParams) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(dbParams.dbName, dbParams.dbVersion);

        openRequest.onupgradeneeded = function (evt) {
            console.log(`Обновление версии базы данных "${dbParams.dbName}"`, ":", evt.oldVersion, "→", evt.newVersion)
            let version = evt.oldVersion;
            while (version < evt.newVersion) {
                console.debug("Выполняется миграция", version, "→", version + 1)
                dbParams.migrate(openRequest, version);
                version += 1;
            }
            evt.currentTarget.onsuccess = () => {
                console.log(`Обновление базы данных "${dbParams.dbName}" выполнено успешно`);
                const db = openRequest.result;
                resolve(db);
            }
        }

        openRequest.onerror = function () {
            console.error(`Ошибка подключения к базе данных "${dbParams.dbName}"`, openRequest.error);
            reject(openRequest.error);
        };

        openRequest.onblocked = function () {
            // Если есть другое соединение к той же базе,
            // и оно не было закрыто после срабатывания на нём db.onversionchange
            console.warn(`Подключение к базе данных "${dbParams.dbName}" заблокировано другим соединением`);
            reject(openRequest.error);
        };

        openRequest.onsuccess = function () {
            const db = openRequest.result;
            resolve(db);

            // Если в другой вкладке запущено обновление до новой версии
            db.onversionchange = function () {
                console.log(`Подключение к базе данных "${dbParams.dbName}" закрыто, т.к. выполняется обновление версии`);
                db.close();
                reject(openRequest.error);
            };
        };
    });
}

/**
 * Использовать транзакцию на запись
 * @param {DataBaseParams} dbParams - параметры подключения к базе данных
 * @param {(objectStore: IDBObjectStore) => void} execute - функция работы с хранилищем
 * @returns {Promise<void>}
 */
export async function useWriteTransaction(dbParams, execute) {
    const db = await useDbContext(dbParams);
    const transaction = db.transaction([dbParams.storeName], "readwrite");
    const objectStore = transaction.objectStore(dbParams.storeName);
    return new Promise((resolve, reject) => {
        execute(objectStore);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
    });
}

/**
 * Использовать транзакцию на чтение
 * @param {DataBaseParams} dbParams - параметры подключения к базе данных
 * @param {(objectStore: IDBObjectStore) => IDBRequest} execute - функция работы с хранилищем (get, getAll, ...)
 */
export async function useReadTransaction(dbParams, execute) {
    const db = await useDbContext(dbParams);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([dbParams.storeName], "readonly");
        const objectStore = transaction.objectStore(dbParams.storeName);
        const request = execute(objectStore);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Использовать транзакцию на чтение (несколько функций)
 * @param {DataBaseParams} dbParams - параметры подключения к базе данных
 * @param {(objectStore: IDBObjectStore) => Array<IDBRequest>} enumerateRequests - перечисление функций работы с хранилищем (get, getAll, ...)
 */
export async function useReadTransactionMany(dbParams, enumerateRequests) {
    const db = await useDbContext(dbParams);
    const transaction = db.transaction([dbParams.storeName], "readonly");
    const objectStore = transaction.objectStore(dbParams.storeName);
    const requests = enumerateRequests(objectStore)
        .map(request =>
            new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }));
    
    return Promise.all(requests);
}
