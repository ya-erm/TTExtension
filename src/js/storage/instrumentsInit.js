/** Название хранилища в БД */
export const instrumentsStoreName = "instruments";

/**
 * Выполнить миграцию
 * @param {IDBDatabase} db - API БД
 * @param {number} version - версия БД
 */
export function migrate(db, version) {
    switch (version) {
        case 0:
            const instrumentsStore = db.createObjectStore(instrumentsStoreName, { keyPath: "ticker" });
            instrumentsStore.createIndex("figiIndex", "figi", { unique: true });
            instrumentsStore.createIndex("isinIndex", "isin", { unique: true });
    }
}
