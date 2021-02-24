import { migrate as instrumentsMigrate } from './instrumentsInit.js'

/** Название базы данных */
const dbName = "db";
/** Версия базы данных */
const dbVersion = 1;

/**
 * Использовать подключение к базе данных
 * @returns {Promise<IDBDatabase>}
 */
function useDbContext() {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(dbName, dbVersion);

        openRequest.onupgradeneeded = function (evt) {
            const db = evt.currentTarget.result;
            console.log("Обновление версии базы данных:", evt.oldVersion, "→", evt.newVersion)
            let version = evt.oldVersion;
            while (version < evt.newVersion) {
                console.debug("Выполняется миграция", version, "→", version + 1)
                // Вызвать все функции миграций:
                instrumentsMigrate(db, version);
                // ...
                version += 1;
            }
            evt.currentTarget.onsuccess = () => console.log("Обновление базы данных выполнено успешно");
        }

        openRequest.onerror = function () {
            console.error("Ошибка подключения к базе данных", openRequest.error);
            reject(openRequest.error);
        };

        openRequest.onblocked = function () {
            // Если есть другое соединение к той же базе,
            // и оно не было закрыто после срабатывания на нём db.onversionchange
            console.warn("Подключение к базе данных заблокировано другим соединением");
            reject(openRequest.error);
        };

        openRequest.onsuccess = function () {
            const db = openRequest.result;
            resolve(db);

            // Если в другой вкладке запущено обновление до новой версии
            db.onversionchange = function () {
                console.log("Подключение к базе данных закрыто, т.к. выполняется обновление версии");
                db.close();
                reject(openRequest.error);
            };
        };
    });
}

/**
 * Использовать транзакцию на запись
 * @param {string} storeName - название хранилища
 * @param {(objectStore: IDBObjectStore) => void} execute - функция работы с хранилищем
 * @returns {Promise<void>}
 */
export async function useWriteTransaction(storeName, execute) {
    const db = await useDbContext();
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
        execute(objectStore);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
    });
}

/**
 * Использовать транзакцию на чтение
 * @param {string} storeName - название хранилища
 * @param {(objectStore: IDBObjectStore) => IDBRequest} execute - функция работы с хранилищем (get, getAll, ...)
 */
export async function useReadTransaction(storeName, execute) {
    const db = await useDbContext();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = execute(objectStore);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
