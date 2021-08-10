// @ts-check
import { Portfolio } from "./portfolio.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";
import { setClassIf } from "./utils.js";

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

    /** @type {{[resource: string]: number}} */
    requests : {},

    /** @typedef QueuedRequest
     * @property {(data: any) => void} resolve
     * @property {(error: any) => void} reject
     */
    /** @typedef QueuedRequestsGroup
     * @property {number} priority
     * @property {Array<QueuedRequest>} promises
     */
    /** @type {{[resource: string]: {[path: string]: QueuedRequestsGroup}}} */
    queue: {},
};

// @ts-ignore
window.TTApi = TTApi;

/** Очистить все данные */
function eraseData() {
    TTApi.token = undefined;
    TTApi.currencyRates = {};
    TTApi.portfolios = [];
}

/** Сохранить портфели */
function savePortfolios() {
    localStorage.setItem("portfolios", JSON.stringify(TTApi.portfolios));
}

/** Ограничения */
const requestLimits = {
    portfolio: 120,
    market: 240,
    orders: 100,
    operations: 120,
    default: 100,
}

/** Отрисовка состояния очереди */
export function drawQueueStatus() {
    document.querySelectorAll(".requests-queue").forEach(container => {
        const span = container.querySelector("span");
        let title = "Requests in queue:\n";
        const workload = Object.entries(TTApi.queue).reduce((acc, [resource, pathsQueue]) => {
            acc[resource] = Object.keys(pathsQueue).length;
            title += `/${resource}: ${acc[resource]} requests\n`;
            return acc;
        }, {});
        const totalWorkload = Object.values(workload).reduce((acc, item) => acc + item, 0);
        setClassIf(container, "d-none", totalWorkload <= 0);
        if (totalWorkload > 0) {
            span.textContent = "Q: " + totalWorkload;
            // @ts-ignore
            span.title = title.trimEnd();
        } else {
            span.textContent = "";
            span.title = "";
        }
    });
}

/**
 * Добавить запрос в очередь
 * @param {string} resource - ресурс
 * @param {string} path - относительный адрес
 * @param {number} priority - приоритет
 * @returns {Promise<any>}
 */
function addToQueue(resource, path, priority) {
    return new Promise((resolve, reject) => {
        if (!TTApi.queue[resource]) {
            TTApi.queue[resource] = {};
        }
        if (!TTApi.queue[resource][path]) {
            TTApi.queue[resource][path] = { priority, promises: [] };
        }
        TTApi.queue[resource][path].priority = priority;
        TTApi.queue[resource][path].promises.push({ resolve, reject });
        drawQueueStatus();
    });
}

/**
 * Обработка очереди
 * @param {string} resource
 */
async function processQueue (resource) {
    // Обрабатываем очередь этого же ресурса
    const pathsQueue = TTApi.queue[resource] ?? {};
    // Извлекаем первый запрос из очереди
    const keyValuePair = Object.entries(pathsQueue).sort((a, b) => a[1].priority - b[1].priority).shift()
    if (!keyValuePair) { return; }
    const [path, requestsGroup] = keyValuePair;
    delete pathsQueue[path];
    TTApi.queue[resource] = pathsQueue;
    drawQueueStatus();
    console.log("Запрос из очереди", path, 
        "приоритет:", requestsGroup.priority, 
        "в группе:", requestsGroup.promises.length, 
        "в очереди:", Object.keys(pathsQueue).length, "групп");
    await _httpGet(path)
        .then(response => {
            requestsGroup.promises.forEach(promise => {
                promise.resolve(response);
            });
        })
        .catch(error => {
            console.log("Запрос из очереди", path, "завершился с ошибкой", error);
            if (error.code == 429) {  // Too many requests
                // Возвращаем группу в очередь
                TTApi.queue[resource][path] = requestsGroup;
                processTooManyRequest(resource);
            } else {
                requestsGroup.promises.forEach(promise => {
                    promise.reject(error);
                });
            }
        });
}

/**
 * Обработка ошибки 429 Too many request
 * @param {string} resource 
 */
function processTooManyRequest(resource) {
    const limit = requestLimits[resource] ?? requestLimits.default;
    const overload = limit - TTApi.requests[resource];
    TTApi.requests[resource] = limit;
    console.log(`Превышено количество запросов ${resource}, overload:`, overload);
    if (overload == 0) { return; }
    setTimeout(() => {
        TTApi.requests[resource] -= overload;
        for(let i = 0; i < overload; i++) {
            processQueue(resource);
        }
    }, 60 * 1000);
}

/**
 * Отправить HTTP GET запрос к API с учетом очереди и приоритетов 
 * @param {string} path - относительный адрес
 * @param {number?} priority - приоритет
 */
async function httpGet(path, priority = 0) {
    const resource = path.split("?")[0].split("/")[1];
    const workload = (TTApi.requests[resource] ?? 0);
    const limit = requestLimits[resource] ?? requestLimits.default;
    const queueLength = Object.keys(TTApi.queue[resource]?? {}).length;
    if (workload + 1 > limit) {
        console.log(`Превышено количество запросов /${resource} (лимит: ${limit}),`, "в очереди:", queueLength);
        return addToQueue(resource, path, priority);
    }
    TTApi.requests[resource] = workload + 1;
    try {
        const result = await _httpGet(path);
        setTimeout(() => {
            TTApi.requests[resource] -= 1;
            processQueue(resource);
        }, 60 * 1000);
        return result;
    }
    catch(error) {
        if (error.code == 429) {  // Too many requests
            processTooManyRequest(resource);
            return addToQueue(resource, path, priority);
        } else {
            return Promise.reject(error);
        }
    }
}

/**
 * Отправить HTTP GET запрос к API
 * @param {string} path - относительный адрес
 */
async function _httpGet(path) {
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
async function loadCurrencies(account) {
    const payload = await httpGet(`/portfolio/currencies?brokerAccountId=${account}`);
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
 * @property {{currency: string, value: number}?} averagePositionPriceNoNkd
 */

/**
 * Загрузить позиции
 * @param {string} account - идентификатор счёта
 * @returns {Promise<PortfolioPosition[]>}
 */
async function loadPortfolio(account) {
    const payload = await httpGet(`/portfolio?brokerAccountId=${account}`);
    return payload.positions;
}

/**
 * Загрузить операции
 * @param {string | undefined} figi - идентификатор
 * @param {string} account - идентификатор счёта
 * @param {Date} fromDate - начало интервала
 * @param {Date} toDate - окончание интервала
 * @returns {Promise<Operation[]>}
 */
async function loadOperationsByFigi(figi, account, fromDate = undefined, toDate = undefined) {
    const from = encodeURIComponent(fromDate?.toISOString() ?? '2000-01-01T00:00:00Z');
    const to = encodeURIComponent(toDate?.toISOString() ?? new Date().toISOString());
    const payload = await httpGet(`/operations?from=${from}&to=${to}`
        + (!!figi ? `&figi=${figi}` : "")
        + `&brokerAccountId=${account}`);
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
async function placeLimitOrder(figi, body, account) {
    /** @type {PlaceLimitOrderResponse} */
    const payload = await httpPost(`/orders/limit-order?figi=${figi}&brokerAccountId=${account}`, body);
    
    if (payload.rejectReason) {
        throw new Error(payload.message);
    }

    return { ...payload, figi, type: "Limit", price: body.price };
}
