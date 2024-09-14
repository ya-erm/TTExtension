// @ts-check
import { useReadTransaction } from "./database.js";
import { Repository } from "./repository.js";

/** @typedef {import('../types').Candle} Candle */

/** Название хранилища в базе данных */
const storeName = "candles";

/**
 * Хранилище инструментов
 * @extends {Repository<Candle>}
 */
export class CandlesRepository extends Repository {
    constructor() {
        super({
            dbName: "candles",
            dbVersion: 1,
            storeName,
            migrate: (openDbRequest, version) => {
                const db = openDbRequest.result;
                switch (version) {
                    case 0:
                        const candlesStore = db.createObjectStore(storeName, { keyPath: ["figi", "interval", "time"]});
                        candlesStore.createIndex("figiIntervalIndex", ["figi", "interval"], { unique: false });
                }
            }
        });
    }


    /**
     * Получить свечи за
     * @param {string} figi - идентификатор инструмента
     * @param {import("../types").CandleInterval} interval - интервал
     * @returns {Promise<Candle[]>}
     */
    async getAllByInterval(figi, interval) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("figiIntervalIndex").getAll([figi, interval]));
    }
}

const candlesRepository = new CandlesRepository();

export default candlesRepository;
