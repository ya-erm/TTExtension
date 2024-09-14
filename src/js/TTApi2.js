// @ts-check

import { storage } from "./storage.js";

// Документация:
// https://tinkoff.github.io/investAPI/
// https://tinkoff.github.io/investAPI/swagger-ui/

const apiURL = "https://invest-public-api.tinkoff.ru/rest";

const SERVICES = {
    INSTRUMENTS: "/tinkoff.public.invest.api.contract.v1.InstrumentsService",
    ORDERS: "/tinkoff.public.invest.api.contract.v1.OrdersService",
    OPERATIONS: "/tinkoff.public.invest.api.contract.v1.OperationsService",
    MARKET_DATA: "/tinkoff.public.invest.api.contract.v1.MarketDataService",
    USERS: "/tinkoff.public.invest.api.contract.v1.UsersService",
};

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
        console.debug(`[TTApi-2] POST: ${method}`, body, "\n", data);
        return data;
    } else {
        console.warn(`[TTApi-2] POST: ${method}`, body, "\n", response.statusText);
        const error = new Error(response.statusText);
        // @ts-ignore
        error.code = response.status;
        throw error;
    }
}

export const TTApi2 = {
    /**
     * Загрузить список доступных счётов
     * @returns {Promise<import("./types").AccountDto[]>}
     */
    fetchAccountsAsync: async ()=> {
        const data = await httpPostAsync(SERVICES.USERS + "/GetAccounts");
        return data.accounts;
    },

    // #region OPERATIONS

    /**
     * Загрузить позиции
     * @param {string} accountId - идентификатор счёта
     * @returns {Promise<import("./types").PortfolioPositionDto[]>}
     */
    fetchPortfolioAsync: async (accountId) => {
        const data = await httpPostAsync(
            SERVICES.OPERATIONS + "/GetPortfolio",
            {
                accountId,
            }
        );
        return data.positions;
    },

    /**
     * Загрузить операции
     * @param {string | null} figi - идентификатор
     * @param {string} accountId - идентификатор счёта
     * @param {Date | undefined} fromDate - начало интервала
     * @param {Date | undefined} toDate - окончание интервала
     * @returns {Promise<import("./types").OperationDto[]>}
     */
    fetchOperationsByFigiAsync: async (
        figi,
        accountId,
        fromDate = undefined,
        toDate = undefined
    ) => {
        const from = fromDate?.toISOString() ?? "2000-01-01T00:00:00Z";
        const to = toDate?.toISOString() ?? new Date().toISOString();
        const data = await httpPostAsync(
            SERVICES.OPERATIONS + "/GetOperations",
            {
                accountId,
                from,
                to,
                figi,
                state: "OPERATION_STATE_EXECUTED",
            }
        );
        return data.operations;
    },

    // #endregion


    // #region INSTRUMENTS

    /**
     * Загрузить список всех валют
     * @returns {Promise<import("./types").CurrencyInstrumentDto[]>}
     */
    fetchCurrenciesAsync: async() => {
        console.trace("[TTApi2] fetchCurrenciesAsync");
        const data = await httpPostAsync(SERVICES.INSTRUMENTS + "/Currencies");
        return data.instruments;
    },

    /**
     * Загрузить список всех акций
     * @returns {Promise<import("./types").InstrumentDto[]>}
     */
    fetchSharesAsync: async () => {
        const data = await httpPostAsync(SERVICES.INSTRUMENTS + "/Shares");
        return data.instruments;
    },

    /**
     * Загрузить список всех облигаций
     * @returns {Promise<import("./types").InstrumentDto[]>}
     */
    fetchBondsAsync: async () => {
        const data = await httpPostAsync(SERVICES.INSTRUMENTS + "/Bonds");
        return data.instruments;
    },

    /**
     * Загрузить список всех фондов
     * @returns {Promise<import("./types").InstrumentDto[]>}
     */
    fetchEtfsAsync: async () => {
        const data = await httpPostAsync(SERVICES.INSTRUMENTS + "/Etfs");
        return data.instruments;
    },

    /**
     * Загрузить список всех фьючерсов
     * @returns {Promise<import("./types").InstrumentDto[]>}
     */
    fetchFuturesAsync: async () => {
        const data = await httpPostAsync(SERVICES.INSTRUMENTS + "/Futures");
        return data.instruments;
    },

    /**
     * Загрузить инструмент
     * @param {string} figi - идентификатор
     * @returns {Promise<import("./types").InstrumentDto>}
     */
    fetchInstrumentByFigiAsync: async (figi) => {
        const data = await httpPostAsync(
            "/tinkoff.public.invest.api.contract.v1.InstrumentsService/GetInstrumentBy",
            {
                idType: "INSTRUMENT_ID_TYPE_FIGI",
                id: figi,
            }
        );
        return data.instrument;
    },

    // #endregion


    // #region MARKET_DATA

    /**
     * Загрузить свечи
     * @param {string} figi - идентификатор FIGI
     * @param {Date} from
     * @param {Date} to
     * @param {import("./types").HistoricCandleInterval} interval
     * @returns {Promise<import("./types").HistoricCandleDto[]>}
     */
    fetchCandlesAsync: async (figi, from, to, interval) => {
        const fromDate = from.toISOString();
        const toDate = to.toISOString();

        const data = await httpPostAsync(
            SERVICES.MARKET_DATA + "/GetCandles",
            {
                from: fromDate,
                to: toDate,
                figi,
                interval,
            }
        );
        return data.candles;
    },

    /**
     * Загрузить стакан
     * @param {string} figi - идентификатор FIGI
     * @param {number} depth - глубина стакана
     * @returns {Promise<import("./types").OrderBookDto>}
     */
    fetchOrderbookAsync: async (figi, depth = 5) => {
        const data = await httpPostAsync(
            SERVICES.MARKET_DATA + "/GetOrderBook",
            {
                figi,
                depth,
            }
        );
        return data
    },

    // #endregion


    /**
     * Загрузить список активных заявок
     * @param {string} figi - идентификатор FIGI
     * @param {string} accountId - идентификатор счёта
     * @returns {Promise<import("./types").Order[]>}
     */
    fetchOrdersByFigiAsync: async (figi, accountId) => {
        const data = await httpPostAsync(
            SERVICES.ORDERS + "/GetOrders",
            {
                accountId,
            }
        );
        /** @type {import("./types").Order[]} */
        const orders = data.orders;
        return orders.filter((item) => item.figi == figi);
    },

};

// @ts-ignore
window.TTApi2 = TTApi2;
