// @ts-check
import { useReadTransaction } from "./database.js";
import { Repository } from "./repository.js";

/** @typedef {import('../types').Instrument} Instrument */

/** Название хранилища в базе данных */
const storeName = "instruments";

/**
 * Хранилище инструментов
 * @extends {Repository<Instrument>}
 */
export class InstrumentsRepository extends Repository {
    constructor() {
        super({
            dbName: "instruments",
            dbVersion: 1,
            storeName,
            migrate: (openDbRequest, version) => {
                const db = openDbRequest.result;
                switch (version) {
                    case 0:
                        const instrumentsStore = db.createObjectStore(storeName, { keyPath: "figi" });
                        instrumentsStore.createIndex("tickerIndex", "ticker", { unique: true });
                        instrumentsStore.createIndex("isinIndex", "isin", { unique: true });
                }
            }
        });
    }

    /**
     * Получить инструмент по идентификатору FIGI
     * @param {string} figi - идентификатор инструмента FIGI
     * @returns {Promise<Instrument>}
     */
    async getOneByFigi(figi) {
        return await this.getOne(figi);
    }

    /**
     * Получить инструмент по тикеру
     * @param {string} ticker - тикер инструмента
     * @returns {Promise<Instrument>}
     */
    async getOneByTicker(ticker) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("tickerIndex").get(ticker));
    }
    
    /**
     * Получить инструмент по идентификатору ISIN
     * @param {string} isin - идентификатор инструмента ISIN
     * @returns {Promise<Instrument>}
     */
    async getOneByIsin(isin) {
        return await useReadTransaction(this.dbParams, objectStore => objectStore.index("isinIndex").get(isin));
    }
}

const instrumentsRepository = new InstrumentsRepository();

export default instrumentsRepository;
