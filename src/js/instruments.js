// @ts-check
import { TTApi2 } from "./TTApi2.js";
import { mapInstrumentDto } from "./mapping.js";
import { instrumentsRepository } from "./storage/instrumentsRepository.js";

/**
 * Загрузить все инструменты (валюты, акции, облигации, фонды, фьючерсы).
 * @description После загрузки инструменты сохраняются в локальное хранилище.
 */
export async function fetchAllInstruments() {
    return Promise.all([
        TTApi2.fetchCurrenciesAsync().then((currencies) =>
            instrumentsRepository.putMany(
                currencies.map((item) =>
                    mapInstrumentDto({ ...item, instrumentType: "currency" })
                )
            )
        ),
        TTApi2.fetchSharesAsync().then((shares) =>
            instrumentsRepository.putMany(
                shares.map((item) =>
                    mapInstrumentDto({ ...item, instrumentType: "share" })
                )
            )
        ),
        TTApi2.fetchBondsAsync().then((bonds) =>
            instrumentsRepository.putMany(
                bonds.map((item) =>
                    mapInstrumentDto({ ...item, instrumentType: "bond" })
                )
            )
        ),
        TTApi2.fetchEtfsAsync().then((etfs) =>
            instrumentsRepository.putMany(
                etfs.map((item) =>
                    mapInstrumentDto({ ...item, instrumentType: "etf" })
                )
            )
        ),
        TTApi2.fetchFuturesAsync().then((futures) =>
            instrumentsRepository.putMany(
                futures.map((item) =>
                    mapInstrumentDto({ ...item, instrumentType: "futures" })
                )
            )
        ),
    ]);
}

/**
 * Синхронизировать инструменты
 */
export async function syncInstrumentsAsync() {
    const count = await instrumentsRepository.getCount();
    if (count < 1000) {
        console.log("[Instruments] Загрузка инструментов...");
        await fetchAllInstruments();
    }
}

/**
 * Получить инструмент по идентификатору FIGI
 * @param {string} figi - идентификатор FIGI
 * @description
 * Если инструмент не найден в локальном хранилище,
 * то он загружается из API и сохраняется в локальное хранилище.
 * @returns {Promise<import("./types.js").Instrument>}
 */
export async function getInstrumentByFigiAsync(figi) {
    let instrument = await instrumentsRepository.getOneByFigi(figi);
    if (!instrument) {
        const dto = await TTApi2.fetchInstrumentByFigiAsync(figi);
        instrument = mapInstrumentDto(dto);
        instrumentsRepository.putOne(instrument);
    }
    return instrument;
}

/**
 * Получить инструмент по тикеру
 * @param {string} ticker
 * @returns {Promise<import("./types.js").Instrument?>}
 */
export async function getInstrumentByTickerAsync(ticker) {
    let instrument = await instrumentsRepository.getOneByTicker(ticker);
    if (!instrument) {
        // TODO: попробовать загрузить инструмент из API
        // const dto = await TTApi2.loadInstrumentByTickerAsync(ticker);
        // instrument = mapInstrumentDto(dto);
        // instrumentsRepository.putOne(instrument);
        return null;
    }
    return instrument;
}
