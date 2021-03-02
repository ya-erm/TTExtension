import { Portfolio } from "./portfolio.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";

const apiURL = 'https://api-invest.tinkoff.ru/openapi';
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
// https://tinkoffcreditsystems.github.io/invest-openapi/swagger-ui/

const portfolios = JSON.parse(localStorage.getItem('portfolios')) || [];
portfolios.forEach(portfolio => portfolio.__proto__ = Portfolio.prototype);

export const TTApi = {
    token: localStorage.getItem("token"),

    currencyRates: {},
    instruments: JSON.parse(localStorage.getItem('instruments')) || [],
    portfolios,

    loadAccounts,
    loadPortfolio,
    loadCurrencies,
    findInstrumentByFigi,
    loadInstrumentByFigi,
    loadInstrumentByTicker,
    loadOperationsByFigi,
    findCandles,
    loadCandles,
    loadOrderbook,
    loadOrderbookByTicker,
    getCurrencyRate,
    savePortfolios,
    eraseData,
    httpGet,
};

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
        error.code = response.status;
        throw error;
    }
}

/**
 * Загрузить список доступных счётов
 */
async function loadAccounts() {
    const payload = await httpGet("/user/accounts");
    return payload.accounts;
}

/**
 * Загрузить доступные денежные средства
 * @param {string} account - идентификатор счёта
 */
async function loadCurrencies(account = undefined) {
    const payload = await httpGet("/portfolio/currencies" + (!!account ? `?brokerAccountId=${account}` : ""));
    return payload.currencies;
}

/**
 * Загрузить позиции
 * @param {string} account - идентификатор счёта
 */
async function loadPortfolio(account = undefined) {
    const payload = await httpGet("/portfolio" + (!!account ? `?brokerAccountId=${account}` : ""));
    return payload.positions;
}

/**
 * Загрузить операции
 * @param {string} figi - идентификатор
 * @param {string} account - идентификатор счёта
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
 */
async function loadInstrumentByFigi(figi) {
    const instrument = await httpGet(`/market/search/by-figi?figi=${figi}`);
    instrumentsRepository.putOne(instrument);
    return instrument;
}

/**
 * Загрузить инструмент
 * @param {string} ticker - идентификатор
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
 * Загрузить свечи
 * @param {string} figi - идентификатор
 * @param {Date} from 
 * @param {Date} to 
 * @param {string} interval - интервал 1min, 2min, 3min, 5min, 10min, 15min, 30min, hour, day, week, month
 */
async function loadCandles(figi, from, to, interval) {
    const fromDate = encodeURIComponent(from.toISOString());
    const toDate = encodeURIComponent(to.toISOString());
    const payload = await httpGet(`/market/candles?figi=${figi}&from=${fromDate}&to=${toDate}&interval=${interval}`);
    await saveCandles(figi, payload.candles);
    return payload.candles;
}

/**
 * Загрузить стакан
 * @param {string} figi - идентификатор
 */
async function loadOrderbook(figi) {
    const orderbook = await httpGet(`/market/orderbook?figi=${figi}&depth=${1}`);
    return orderbook;
}

/**
 * Загрузить стакан
 * @param {string} ticker - идентификатор
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
 * @param {string} figi - идентификатор
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
 * @param {string} figi - идентификатор
 * @param {Date} from 
 * @param {Date} to 
 * @param {string} interval 
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
 * @param {array} candles - свечи
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
