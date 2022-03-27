// @ts-check

import { storage } from "./storage.js";

// Документация:
// https://tinkoff.github.io/investAPI/
// https://tinkoff.github.io/investAPI/swagger-ui/

const apiURL = "https://invest-public-api.tinkoff.ru/rest";

export const TTApi2 = {
    loadAccountsAsync,
    loadPortfolioAsync,
    loadCurrenciesAsync,
    loadInstrumentByFigiAsync,
    loadOperationsByFigiAsync,
    loadOrdersByFigiAsync,
    loadCandlesAsync,
};

// @ts-ignore
window.TTApi2 = TTApi2;

/**
 * Отправить HTTP POST запрос к API
 * @param {string} path - относительный адрес
 * @param {object} body - тело запроса
 * @returns
 */
async function httpPostAsync(path, body = {}) {
    const response = await fetch(apiURL + path, {
        method: "POST",
        headers: {
            Authorization: "Bearer " + storage.token,
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(body),
    });
    const pathParts = path.split(".");
    const method = pathParts[pathParts.length - 1];
    if (response.status == 200) {
        const data = await response.json();
        console.debug(`POST: ${method}`, body, "\n", data);
        return data;
    } else {
        console.warn(`POST: ${method}`, body, "\n", response.statusText);
        const error = new Error(response.statusText);
        // @ts-ignore
        error.code = response.status;
        throw error;
    }
}

/**
 * Загрузить список доступных счётов
 * @returns {Promise<import("./types").AccountDto[]>}
 */
async function loadAccountsAsync() {
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.UsersService/GetAccounts"
    );
    return data.accounts;
}

/**
 * Загрузить позиции
 * @param {string} accountId - идентификатор счёта
 * @returns {Promise<import("./types").PortfolioPositionDto[]>}
 */
async function loadPortfolioAsync(accountId) {
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.OperationsService/GetPortfolio",
        {
            accountId,
        }
    );
    return data.positions;
}

/**
 * Загрузить валютны
 * @param {string} accountId - идентификатор счёта
 * @returns {Promise<import("./types").MoneyValue[]>}
 */
async function loadCurrenciesAsync(accountId) {
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.OperationsService/GetPositions",
        {
            accountId,
        }
    );
    return data.money;
}

/**
 * Загрузить операции
 * @param {string | null} figi - идентификатор
 * @param {string} accountId - идентификатор счёта
 * @param {Date} fromDate - начало интервала
 * @param {Date} toDate - окончание интервала
 * @returns {Promise<import("./types").OperationDto[]>}
 */
async function loadOperationsByFigiAsync(
    figi,
    accountId,
    fromDate = undefined,
    toDate = undefined
) {
    const from = fromDate?.toISOString() ?? "2000-01-01T00:00:00Z";
    const to = toDate?.toISOString() ?? new Date().toISOString();
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.OperationsService/GetOperations",
        {
            accountId,
            from,
            to,
            figi,
            state: "OPERATION_STATE_EXECUTED",
        }
    );
    return data.operations;
}

/**
 * Загрузить инструмент
 * @param {string} figi - идентификатор
 * @returns {Promise<import("./types").InstrumentDto>}
 */
async function loadInstrumentByFigiAsync(figi) {
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.InstrumentsService/GetInstrumentBy",
        {
            idType: "INSTRUMENT_ID_TYPE_FIGI",
            id: figi,
        }
    );
    return data.instrument;
}

/**
 * Загрузить список активных заявок
 * @param {string} figi - идентификатор FIGI
 * @param {string} accountId - идентификатор счёта
 * @returns {Promise<import("./types").Order[]>}
 */
async function loadOrdersByFigiAsync(figi, accountId) {
    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.OrdersService/GetOrders",
        {
            accountId,
        }
    );
    /** @type {import("./types").Order[]} */
    const orders = data.orders;
    return orders.filter((item) => item.figi == figi);
}

/**
 * Загрузить свечи
 * @param {string} figi - идентификатор FIGI
 * @param {Date} from
 * @param {Date} to
 * @param {import("./types").HistoricCandleInterval} interval
 * @returns {Promise<import("./types").HistoricCandleDto[]>}
 */
async function loadCandlesAsync(figi, from, to, interval) {
    const fromDate = from.toISOString();
    const toDate = to.toISOString();

    const data = await httpPostAsync(
        "/tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles",
        {
            from: fromDate,
            to: toDate,
            figi,
            interval,
        }
    );
    return data.candles;
}
