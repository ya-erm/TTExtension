// @ts-check
import { Portfolio } from "./portfolio.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";

const apiURL = 'https://api-invest.tinkoff.ru/openapi';
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
// https://tinkoffcreditsystems.github.io/invest-openapi/swagger-ui/

/** @typedef {import('./storage/operationsRepository.js').Operation} Operation */
/** @typedef {import('./storage/instrumentsRepository.js').Instrument} Instrument */

const portfolios = JSON.parse(localStorage.getItem('portfolios')) || [];
portfolios.forEach(portfolio => {
    portfolio.__proto__ = Portfolio.prototype;
    portfolio.fillMissingFields();
});

export const TTApi = {
    token: localStorage.getItem("token"),

    /**@type {Object<string, number>} */
    currencyRates: {},
    /** @type {Array<Portfolio>} */
    portfolios,

    loadAccounts,
    loadPortfolio,
    loadCurrencies,
    findInstrumentByFigi,
    loadInstrumentByFigi,
    loadInstrumentByTicker,
    loadOperationsByFigi,
    loadOrdersByFigi,
    cancelOrder,
    findCandles,
    loadCandles,
    loadOrderbook,
    loadOrderbookByTicker,
    placeLimitOrder,
    getCurrencyRate,
    savePortfolios,
    eraseData,
    httpGet,
    httpPost,
};

// @ts-ignore
window.TTApi = TTApi;

/**
 * Очистить все данные
 */
function eraseData() {
    TTApi.token = undefined;
    TTApi.currencyRates = {};
    TTApi.portfolios = [];
}

/**
 * Сохранить портфели
 */
function savePortfolios() {
    localStorage.setItem("portfolios", JSON.stringify(TTApi.portfolios));
}

/**
 * Отправить HTTP GET запрос к API
 * @param {string} path - относительный адрес
 */
async function httpGet(path) {
    const response = await fetch(apiURL + path, { headers: { Authorization: 'Bearer ' + TTApi.token } });
    if (response.status == 200) {
        const data = await response.json();
        console.log(`GET ${path}\n`, data);
        return (data.payload);
    } else {
        console.log(`GET ${path}\n`, response.statusText);
        const error = new Error(response.statusText);
        // @ts-ignore
        error.code = response.status;
        throw error;
    }
}

/** 
 * @typedef UserAccount
 * @property {string} brokerAccountId - идентификатор счёта
 * @property {string} brokerAccountType - тип счёта (Tinkoff, TinkoffIis)
 */

/**
 * Отправить HTTP PUT запрос к API
 * @param {string} path - относительный адрес
 * @param {object} body - тело запроса
 * @returns 
 */
async function httpPost(path, body) {
    const response = await fetch(apiURL + path, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + TTApi.token,
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify(body)
    });
    if (response.status == 200) {
        const data = await response.json();
        console.log(`POST ${path}`, body, '\n', data);
        return (data.payload);
    } else {
        console.log(`POST ${path}`, body, '\n', response.statusText);
        const error = new Error(response.statusText);
        // @ts-ignore
        error.code = response.status;
        throw error;
    }
}

/**
 * Загрузить список доступных счётов
 * @returns {Promise<UserAccount[]>}
 */
async function loadAccounts() {
    const payload = await httpGet("/user/accounts");
    return payload.accounts;
}

/** 
 * @typedef CurrencyPosition
 * @property {string} currency - валюта
 * @property {number} balance - баланс
 */

/**
 * Загрузить доступные денежные средства
 * @param {string} account - идентификатор счёта
 * @returns {Promise<CurrencyPosition[]>}
 */
async function loadCurrencies(account = undefined) {
    const payload = await httpGet("/portfolio/currencies" + (!!account ? `?brokerAccountId=${account}` : ""));
    return payload.currencies;
}

/**
 * @typedef PortfolioPosition
 * @property {string} figi
 * @property {string} ticker
 * @property {string} isin 
 * @property {string} name
 * @property {string} instrumentType
 * @property {number} balance
 * @property {number} lots
 * @property {number?} blocked
 * @property {{currency: string, value: number}?} expectedYield
 * @property {{currency: string, value: number}?} averagePositionPrice
 */

/**
 * Загрузить позиции
 * @param {string} account - идентификатор счёта
 * @returns {Promise<PortfolioPosition[]>}
 */
async function loadPortfolio(account = undefined) {
    const payload = await httpGet("/portfolio" + (!!account ? `?brokerAccountId=${account}` : ""));
    return payload.positions;
}

/**
 * Загрузить операции
 * @param {string} figi - идентификатор
 * @param {string} account - идентификатор счёта
 * @returns {Promise<Operation[]>}
 */
async function loadOperationsByFigi(figi, account = undefined) {
    const fromDate = encodeURIComponent('2000-01-01T00:00:00Z');
    const toDate = encodeURIComponent(new Date().toISOString());
    const payload = await httpGet(`/operations?from=${fromDate}&to=${toDate}`
        + (!!figi ? `&figi=${figi}` : "")
        + (!!account ? `&brokerAccountId=${account}` : ""));
    return payload.operations.map(item => ({ ...item, account }));
}

/**
 * Загрузить инструмент
 * @param {string} figi - идентификатор
 * @returns {Promise<Instrument>}
 */
async function loadInstrumentByFigi(figi) {
    const instrument = await httpGet(`/market/search/by-figi?figi=${figi}`);
    instrumentsRepository.putOne(instrument);
    return instrument;
}

/**
 * Загрузить инструмент
 * @param {string} ticker - идентификатор
 * @returns {Promise<Instrument>}
 */
async function loadInstrumentByTicker(ticker) {
    const payload = await httpGet(`/market/search/by-ticker?ticker=${ticker}`);
    if (payload.instruments.length > 0) {
        const instrument = payload.instruments[0];
        instrumentsRepository.putOne(instrument);
        return instrument;
    }
    return null;
}

/**
 * @typedef Order
 * @property {string} orderId - идентификатор заявки
 * @property {string} figi - идентификатор FIGI
 * @property {string} operation - тип операции (Buy, Sell)
 * @property {string} type - тип заявки (Limit, Market)
 * @property {string} status - статус заявки (New, PartiallyFill, Fill, Cancelled, Replaced, PendingCancel, Rejected, PendingReplace, PendingNew)
 * @property {number} requestedLots - запрашиваемое количество лотов в заявке
 * @property {number} executedLots - количество исполненных лотов
 * @property {number} price - цена
 */

/**
 * Загрузить список активных заявок
 * @param {string} figi - идентификатор FIGI
 * @param {string} account - идентификатор счёта
 * @returns {Promise<Order[]>}
 */
async function loadOrdersByFigi(figi, account) {
    const orders = await httpGet(`/orders?figi=${figi}&brokerAccountId=${account}`);
    return orders.filter(item => item.figi == figi);
}

/**
 * Отменить заявку
 * @param {string} orderId - идентификатор заявки
 * @param {string} account - идентификатор счёта
 * @returns 
 */
async function cancelOrder(orderId, account) {
    const payload = await httpPost(`/orders/cancel?orderId=${orderId}&brokerAccountId=${account}`);
    return payload;
}

/**
 * @typedef Candle
 * @property {string} figi - идентификатор FIGI
 * @property {string} interval - интервал
 * @property {number} o - open
 * @property {number} c - close
 * @property {number} h - high
 * @property {number} l - low
 * @property {number} v - volume
 * @property {string} time
 */

/**
 * Загрузить свечи
 * @param {string} figi - идентификатор FIGI
 * @param {Date} from 
 * @param {Date} to 
 * @param {string} interval - интервал 1min, 2min, 3min, 5min, 10min, 15min, 30min, hour, day, week, month
 * @returns {Promise<Candle[]>}
 */
async function loadCandles(figi, from, to, interval) {
    const fromDate = encodeURIComponent(from.toISOString());
    const toDate = encodeURIComponent(to.toISOString());
    const payload = await httpGet(`/market/candles?figi=${figi}&from=${fromDate}&to=${toDate}&interval=${interval}`);
    await saveCandles(figi, payload.candles);
    return payload.candles;
}

/**
 * @typedef Orderbook
 * @property {string} figi - идентификатор FIGI
 * @property {number} depth - глубина стакана
 * @property {OrderbookItem[]} bids
 * @property {OrderbookItem[]} asks 
 * @property {string} tradeStatus - статус торгов
 * @property {number} minPriceIncrement - шаг цены
 * @property {number?} faceValue - номинал для облигаций
 * @property {number?} lastPrice - цена последней  сделки
 * @property {number?} closePrice - цена закрытия
 * @property {number?} limitUp - верхняя граница цены
 * @property {number?} limitDown - нижняя граница цены
 */

/**
 * @typedef OrderbookItem
 * @property {number} price - цена
 * @property {number} quantity - количество
 */

/**
 * Загрузить стакан
 * @param {string} figi - идентификатор FIGI
 * @returns {Promise<Orderbook>}
 */
async function loadOrderbook(figi) {
    const orderbook = await httpGet(`/market/orderbook?figi=${figi}&depth=${1}`);
    return orderbook;
}

/**
 * Загрузить стакан
 * @param {string} ticker - тикер
 * @returns {Promise<Orderbook>}
 */
async function loadOrderbookByTicker(ticker) {
    const instrument = await loadInstrumentByTicker(ticker);
    if (!instrument) {
        throw new Error("Instrument not found");
    }

    return await loadOrderbook(instrument.figi);
}

/**
 * Найти инструмент
 * @param {string} figi - идентификатор FIGI
 * @returns {Promise<Instrument>}
 */
async function findInstrumentByFigi(figi) {
    let instrument = await instrumentsRepository.getOneByFigi(figi);
    if (!instrument) {
        instrument = await loadInstrumentByFigi(figi);
        instrumentsRepository.putOne(instrument);
    }
    return instrument;
}

/**
 * Найти свечи в кэше
 * @param {string} figi - идентификатор FIGI
 * @param {Date} from 
 * @param {Date} to 
 * @param {string} interval 
 * @returns {Promise<Candle[]>}
 */
async function findCandles(figi, from, to, interval) {
    const instrument = await instrumentsRepository.getOneByFigi(figi);
    if (instrument?.candles == undefined || instrument.candles[interval] == undefined) {
        return [];
    }
    return instrument.candles[interval].filter(candle => from <= new Date(candle.time) && new Date(candle.time) <= to);
}

/**
 * Сохранить информацию о свечах
 * @param {string} figi - идентификатор
 * @param {Array<Candle>} candles - свечи
 */
async function saveCandles(figi, candles) {
    if (candles.length == 0) { return; }
    const instrument = await findInstrumentByFigi(figi);
    const interval = candles[0].interval;
    if (instrument.candles == undefined) {
        instrument.candles = {};
    }
    if (instrument.candles[interval] == undefined) {
        instrument.candles[interval] = [];
    }
    instrument.candles[interval].push(...candles);
    instrumentsRepository.putOne(instrument);
}

/**
 * Получить текущий курс валюты в рублях
 * @param {string} currency Валюта (USD, EUR)
 * @returns {Promise<number>}
 */
async function getCurrencyRate(currency) {
    let currencyRate = TTApi.currencyRates[currency];
    if (!currencyRate) {
        switch (currency) {
            case "USD":
                currencyRate = (await loadOrderbook("BBG0013HGFT4")).lastPrice; // Доллар США
                break;
            case "EUR":
                currencyRate = (await loadOrderbook("BBG0013HJJ31")).lastPrice; // Евро
                break;
            case "RUB":
                currencyRate = 1;
                break;
        }
        console.log(currency, currencyRate)
        TTApi.currencyRates[currency] = currencyRate;
    }
    return currencyRate;
}

/**
 * @typedef PlaceLimitOrderResponse
 * @property {string} orderId - идентификатор заявки
 * @property {string} operation - тип операции (Buy, Sell)
 * @property {string} status - статус заявки (New, PartiallyFill, Fill, Cancelled, Replaced, PendingCancel, Rejected, PendingReplace, PendingNew)
 * @property {number} requestedLots - запрашиваемое количество лотов в заявке
 * @property {number} executedLots - количество исполненных лотов
 * @property {{currency: string, value: number}?} commission - комиссия
 * @property {string?} rejectReason - причина отказа
 * @property {string?} message - сообщение
 */

/**
 * Создание лимитной заявки
 * @param {string} figi - идентификатор актива
 * @param {{lots: number, operation: string, price: number}} body - тело запроса { lots: 0, operation: "Buy", price: 0 }
 * @param {string} account - идентификатор счёта
 * @returns {Promise<Order>}
 */
async function placeLimitOrder(figi, body, account = undefined) {
    /** @type {PlaceLimitOrderResponse} */
    const payload = await httpPost(`/orders/limit-order?figi=${figi}` + (!!account ? `&brokerAccountId=${account}` : ""), body);
    
    if (payload.rejectReason) {
        throw new Error(payload.message);
    }

    return { ...payload, figi, type: "Limit", price: body.price };
}
