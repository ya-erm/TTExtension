// @ts-check

import {
    mapCandleInterval,
    mapHistoricCandleDto,
    mapInstrumentDto,
    mapOperationDto,
    mapPortfolioPositionDto,
    toNumber,
} from "./mapping.js";
import candlesRepository from "./storage/candlesRepository.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";
import { TTApi2 } from "./TTApi2.js";

/**
 * Найти инструмент
 * @param {string} figi - идентификатор FIGI
 * @returns {Promise<import("./types.js").Instrument>}
 */
export async function findInstrumentByFigiAsync(figi) {
    let instrument = await instrumentsRepository.getOneByFigi(figi);
    if (!instrument) {
        const dto = await TTApi2.loadInstrumentByFigiAsync(figi);
        instrument = mapInstrumentDto(dto);
        instrumentsRepository.putOne(instrument);
    }
    return instrument;
}

/**
 * Загрузить операции
 * @param {string | null} figi - идентификатор
 * @param {string} accountId - идентификатор счёта
 * @param {Date} fromDate - начало интервала
 * @param {Date} toDate - окончание интервала
 * @returns {Promise<import("./types.js").Operation[]>}
 */
export async function loadOperationsByFigiAsync(
    figi,
    accountId,
    fromDate = undefined,
    toDate = undefined
) {
    const items = await TTApi2.loadOperationsByFigiAsync(
        figi,
        accountId,
        fromDate,
        toDate
    );
    const operations = items.map((dto) => {
        const commission = items.find((x) => x.id == dto.parentOperationId);
        return mapOperationDto(dto, accountId, toNumber(commission?.payment));
    });
    operations
    .filter(x => x.operationType === 'OPERATION_TYPE_BROKER_FEE')
    .forEach(fee => {
        const operation = operations.find(item => item.id === fee.parentOperationId);
        if (operation && !operation.commission) {
            operation.commission = fee.payment
        }
    })

    return operations;
}

/**
 * Загрузить позиции
 * @param {string} accountId - идентификатор счёта
 * @returns {Promise<import("./types.js").PortfolioPosition[]>}
 */
export async function loadPortfolioAsync(accountId) {
    const positions = await TTApi2.loadPortfolioAsync(accountId);
    return positions.map(mapPortfolioPositionDto);
}

/**
 * Загрузить список доступных счётов
 * @returns {Promise<import("./types").AccountDto[]>}
 */
export async function loadAccountsAsync() {
    return await TTApi2.loadAccountsAsync();
}

/**
 * Найти свечи в кэше
 * @param {string} figi - идентификатор FIGI
 * @param {Date} from
 * @param {Date} to
 * @param {import("./types.js").CandleInterval} interval
 * @returns {Promise<import("./types.js").Candle[]>}
 */
export async function findCandlesAsync(figi, from, to, interval) {
    const candles = await candlesRepository.getAllByInterval(figi, interval);
    return candles.filter(
        (candle) => from <= new Date(candle.time) && new Date(candle.time) <= to
    );
}

/**
 * Сохранить информацию о свечах
 * @param {Array<import("./types.js").Candle>} candles - свечи
 */
export async function saveCandlesAsync(candles) {
    if (candles.length == 0) {
        return;
    }
    candlesRepository.putMany(candles);
}

/**
 * Загрузить свечи
 * @param {string} figi - идентификатор FIGI
 * @param {Date} from
 * @param {Date} to
 * @param {import("./types.js").CandleInterval} interval - интервал
 * @returns {Promise<import("./types.js").Candle[]>}
 */
export async function loadCandlesAsync(figi, from, to, interval) {
    const items = await TTApi2.loadCandlesAsync(
        figi,
        from,
        to,
        mapCandleInterval(interval)
    );
    const candles = items.map((dto) =>
        mapHistoricCandleDto(dto, interval, figi)
    );
    await saveCandlesAsync(candles);
    return candles;
}
