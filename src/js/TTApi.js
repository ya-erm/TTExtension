const apiURL = 'https://api-invest.tinkoff.ru/openapi';
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
// https://tinkoffcreditsystems.github.io/invest-openapi/swagger-ui/

export const TTApi = {
    token: localStorage.getItem("token"),

    instruments: JSON.parse(localStorage.getItem('instruments')) || [],
    operations: JSON.parse(localStorage.getItem('operations')) || {},
    positions: JSON.parse(localStorage.getItem('positions')) || [],
    fills: JSON.parse(localStorage.getItem('fills')) || {},

    findPosition,
    loadPortfolio,
    loadFillsByFigi,
    loadInstrumentByFigi,
    loadFillsByTicker,
    loadOrderbookByTicker,
    removePosition,
    updateFills,
    eraseData,
    httpGet,
};

window.TTApi = TTApi;

function eraseData() {
    TTApi.token = undefined;
    TTApi.operations = {};
    TTApi.positions = [];
    TTApi.fills = {};
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
 * Загрузить доступные денежные средства
 */
async function loadCurrencies() {
    const payload = await httpGet("/portfolio/currencies");

    updateCurrencies(payload.currencies);

    return payload.currencies;
}

/**
 * Загрузить позиции
 */
async function loadPortfolio() {
    const payload = await httpGet("/portfolio");

    updatePortfolio(payload.positions);

    await loadCurrencies();

    CalculatePositions(TTApi.positions);

    // TODO: загружать стаканы только для избранных позиций, т.к. много запросов
    TTApi.positions
        .filter(_ => _.count == 0)
        .forEach(async position => await loadOrderbook(position));

    return TTApi.positions;
}

/**
 * Загрузить сделки
 * @param {string} ticker - идентификатор
 */
async function loadFillsByTicker(ticker) {
    let figi = TTApi.positions.find(_ => _.ticker == ticker)?.figi;

    if (!figi) {
        const item = await loadInstrumentByTicker(ticker);
        if (!item) {
            throw new Error("Instrument not found");
        }
        figi = item.figi;
    }

    return await loadFillsByFigi(figi);
}

/**
 * Загрузить сделки
 * @param {string} figi - идентификатор
 */
async function loadFillsByFigi(figi) {
    const fromDate = encodeURIComponent('2000-01-01T00:00:00Z');
    const toDate = encodeURIComponent(new Date().toISOString());
    const path = `/operations?from=${fromDate}&to=${toDate}` + (figi != undefined ? `&figi=${figi}` : "");

    const payload = await httpGet(path);
    TTApi.operations[figi] = payload.operations;

    if (figi == undefined) {
        return TTApi.operations[figi];
    }

    const position = await findPosition(figi);

    if (payload.operations.length > 0) {
        updateFills(position, payload.operations);
    }

    return TTApi.fills[position.ticker];
}

/**
 * Загрузить инструмент
 * @param {string} figi - идентификатор
 */
async function loadInstrumentByFigi(figi) {
    return await httpGet(`/market/search/by-figi?figi=${figi}`);
}

/**
 * Загрузить инструмент
 * @param {string} ticker - идентификатор
 */
async function loadInstrumentByTicker(ticker) {
    const payload = await httpGet(`/market/search/by-ticker?ticker=${ticker}`);
    return (payload.instruments.length > 0) ? payload.instruments[0] : null;
}

/**
 * Загрузить стакан
 * @param {string} position - позиция
 */
async function loadOrderbook(position) {
    const orderbook = await httpGet(`/market/orderbook?figi=${position.figi}&depth=${1}`);

    position.lastPrice = orderbook.lastPrice;
    position.lastPriceUpdated = new Date();
    updatePosition(position);

    return orderbook;
}

/**
 * Загрузить стакан
 * @param {string} ticker - идентификатор
 */
async function loadOrderbookByTicker(ticker) {
    let position = TTApi.positions.find(_ => _.ticker.toLowerCase() == ticker.toLowerCase());

    if (!position) {
        console.log(`Position ${ticker.toUpperCase()} not found at local positions. Requesting from API`)
        position = await loadInstrumentByTicker(ticker);
        if (!position) {
            throw new Error("Instrument not found");
        }
    }

    return await loadOrderbook(position);
}

// #region Positions

/**
 * Найти инструмент
 * @param {string} figi - идентификатор
 */
async function findInstrumentByFigi(figi) {
    let instrument = TTApi.instruments.find(_ => _.figi == figi);
    if (!instrument) {
        instrument = await loadInstrumentByFigi(figi);
        TTApi.instruments.push(instrument);
        localStorage.setItem('instruments', JSON.stringify(TTApi.instruments));
    }
    return instrument;
}

/**
 * Найти позицию
 * @param {string} figi - идентификатор
 */
async function findPosition(figi) {
    let position = TTApi.positions.find(_ => _.figi == figi);

    if (!position) {
        const item = await findInstrumentByFigi(figi);
        position = {
            ticker: item.ticker,
            name: item.name,
            figi: item.figi,
            isin: item.isin,
            count: 0,
            instrumentType: item.type,
            currency: item.currency,
        };
        TTApi.positions.push(position);
        sortPositions(TTApi.positions);
    }
    return position;
}

function updateCurrencies(currencies) {
    currencies.forEach(item => {
        if (item.balance == 0) { return; }
        switch (item.currency) {
            case "USD":
                item.name = "Евро";
                item.figi = "BBG0013HGFT4";
                item.ticker = "USD000UTSTOM";
                break;
            case "EUR":
                item.name = "Доллар США";
                item.figi = "BBG0013HJJ31";
                item.ticker = "EUR_RUB__TOM";
                break;
            case "RUB":
                item.name = "Рубли РФ";
                item.figi = item.currency;
                item.ticker = item.currency;
                item.lastPrice = 1;
                item.average = 1;
                break;
            default:
                item.name = item.currency;
                item.figi = item.currency;
                item.ticker = item.currency;
                break;
        }
        let position = TTApi.positions.find(_ => _.instrumentType == "Currency" && _.figi == item.figi);
        if (!position) {
            position = {
                ticker: item.ticker,
                name: item.name,
                figi: item.figi,
                count: item.balance,
                instrumentType: "Currency",
                currency: item.currency,
                lastPrice: item.lastPrice,
                average: item.average,
                needCalc: false,
            };
            TTApi.positions.push(position);
        }
        if (position.count !== item.balance) {
            position.count = item.balance;
            // position.needCalc = true;
        }
        window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
    });
    localStorage.setItem('positions', JSON.stringify(TTApi.positions));
}

/**
 * Отсортировать позиции
 * @param {object} positions - список позиций
 */
function sortPositions(positions) {
    positions.sort((a, b) => {
        let res = a.instrumentType.localeCompare(b.instrumentType);
        if (res != 0) { return res; }
        if (a.count == 0 && b.count != 0) { return 1 };
        if (b.count == 0 && a.count != 0) { return -1 };
        return a.ticker.localeCompare(b.ticker);
    });
}

/**
 * Обновить позиции на основе данных из API
 * @param {object} portfolio - список позиций
 */
function updatePortfolio(portfolio) {
    let created = 0;
    let updated = 0;
    const positions = TTApi.positions;
    portfolio.forEach(item => {
        const lastPrice = item.expectedYield?.value / item.balance + item.averagePositionPrice?.value;
        let position = positions.find(_ => _.figi === item.figi);
        if (!position) {
            position = {
                ticker: item.ticker,
                name: item.name,
                figi: item.figi,
                isin: item.isin,
                count: item.balance,
                instrumentType: item.instrumentType,
                average: item.averagePositionPrice?.value,
                expected: item.expectedYield?.value,
                currency: item.averagePositionPrice?.currency || item.expectedYield?.currency,
                lastPriceUpdate: new Date(),
                needCalc: true,
                lastPrice,
            };
            positions.push(position);
            created++;
        }
        let changed = false;
        if (position.count !== item.balance) {
            position.count = item.balance;
            position.needCalc = true;
            changed = true;
        }
        if (position.lastPrice !== lastPrice) {
            position.lastPrice = lastPrice;
            position.expected = (position.lastPrice - position.average) * position.count;
            position.lastPriceUpdated = new Date();
            changed = true;
        }
        if (changed) {
            updated++;
        }
    });
    positions
        .filter(position => position.count != 0 && position.ticker != "RUB" && !portfolio.find(_ => _.figi == position.figi))
        .forEach(item => {
            item.count = 0;
            item.average = undefined;
            item.lastPrice = undefined;
            item.expected = undefined;
            item.lastPriceUpdated = new Date();
            item.needCalc = true;
            updated++;
        });
    sortPositions(positions);
    localStorage.setItem('positions', JSON.stringify(positions));
    console.log(`Positions created: ${created}, updated: ${updated}`)
}

/**
 * Обновить позицию с сохранением в хранилище и выбросом события
 * @param {object} position - позиция
 * @param {number} average - средняя цена
 * @param {number} fixedPnL - зафиксированную прибыль
 */
function updatePosition(position, average, fixedPnL) {
    position.average = average || position.average;
    position.fixedPnL = fixedPnL || position.fixedPnL;
    position.expected = (position.lastPrice - position.average) * position.count;
    position.needCalc = false;
    console.log(`Position ${position.ticker} updated (average: ${average?.toFixed(2)}, fixedPnL: ${fixedPnL?.toFixed(2)})`);
    window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
    localStorage.setItem('positions', JSON.stringify(TTApi.positions));
}

// Просчитать для позиций среднюю стоимость и зафиксированную прибыль
async function CalculatePositions(positions) {
    const needCalcPositions = positions.filter(_ => _.needCalc);
    console.log(`Calculating ${needCalcPositions.length} positions`);
    needCalcPositions.forEach(async position => await loadFillsByFigi(position.figi));
}

/**
 * Удалить позицию из списка позиций
 * @param {object} position - позиция
 */
function removePosition(position) {
    if (position.count != 0) {
        console.log(`Failed to remove non-zero position ${position.ticker}`);
        return;
    }
    const positions = window.TTApi.positions;
    const index = positions.indexOf(position);
    if (index >= 0) {
        positions.splice(index, 1)
        localStorage.setItem('positions', JSON.stringify(positions));
        window.dispatchEvent(new CustomEvent("PositionRemoved", { detail: { position } }));
    } else {
        console.log(`Failed to remove position ${position.ticker}, it's not found`);
    }
}

// #endregion

// #region Fills 

/**
 * Обновить список сделок и просчитать позиции
 * @param {object} position - позиция
 * @param {object} operations - список операций
 */
function updateFills(position, operations) {
    let created = 0;
    let updated = 0;
    const fills = TTApi.fills[position.ticker] || [];

    let currentQuantity = 0;
    let totalFixedPnL = 0;
    let averagePrice = 0;
    let averagePriceCorrected = 0;

    operations.reverse()
        .filter(_ => _.status == "Done" && ["Buy", "BuyCard", "Sell"].includes(_.operationType))
        .forEach(item => {
            let fill = fills.find(_ => _.id == item.id);
            if (!fill) {
                fill = {
                    id: item.id,
                    date: item.date,
                    operationType: item.operationType,
                    price: item.price,
                    quantity: item.quantity,
                    payment: item.payment,
                    commission: item.commission?.value
                };
                fills.push(fill);
                created++;
            }

            if (fill.price != item.price ||
                fill.commission != item.commission?.value) {
                fill.price = item.price;
                fill.commission = item.commission?.value;
                updated++;
            }

            const result = processOperation({
                currentQuantity,
                totalFixedPnL,
                averagePrice,
                averagePriceCorrected
            }, item);

            currentQuantity = result.currentQuantity;
            totalFixedPnL = result.totalFixedPnL;
            averagePrice = result.averagePrice;
            averagePriceCorrected = result.averagePriceCorrected;

            fill.averagePrice = averagePrice;
            fill.averagePriceCorrected = averagePriceCorrected;
            fill.currentQuantity = currentQuantity
            fill.fixedPnL = result.fixedPnL;
        });

    TTApi.fills[position.ticker] = fills;

    updatePosition(position, averagePrice, totalFixedPnL);

    localStorage.setItem('fills', JSON.stringify(TTApi.fills));
    console.log(`Fills ${position.ticker} created: ${created}, updated: ${updated}`)
}

function processOperation(accumulated, operation) {
    let { currentQuantity, totalFixedPnL, averagePrice, averagePriceCorrected } = accumulated;

    const price = operation.price;
    const cost = -operation.payment;
    const quantity = operation.trades.reduce((res, trade) => res + trade.quantity, 0);
    const commission = Math.abs(operation.commission?.value) || 0;
    const direction = -Math.sign(operation.payment)
    const costCorrected = cost + commission;

    let sumUp = currentQuantity * (averagePrice || 0) + cost;
    let sumUpCorrected = currentQuantity * (averagePriceCorrected || 0) + costCorrected;

    let nextQuantity = currentQuantity + direction * quantity;

    let fixedPnL = null;

    // Переход через 0
    if (nextQuantity < 0 && currentQuantity > 0 ||
        nextQuantity > 0 && currentQuantity < 0) {

        const proportion = Math.abs(currentQuantity / quantity);

        const partialCostCorrected = costCorrected * proportion;

        fixedPnL = Math.sign(currentQuantity) * direction * (currentQuantity * (averagePriceCorrected || 0) + partialCostCorrected);

        averagePrice = price;
        averagePriceCorrected = costCorrected * (1 - proportion) / nextQuantity;

        currentQuantity = nextQuantity;

    } else {
        if (direction * currentQuantity < 0) {
            fixedPnL = direction * quantity * (averagePriceCorrected || 0) - costCorrected;

            currentQuantity = nextQuantity;
        } else {
            currentQuantity = nextQuantity;

            if (currentQuantity != 0) {
                averagePrice = Math.abs(sumUp / currentQuantity);
                averagePriceCorrected = Math.abs(sumUpCorrected / currentQuantity);
            }
        }

        if (currentQuantity == 0) {
            sumUp = 0;
            sumUpCorrected = 0;
            averagePrice = null;
            averagePriceCorrected = null;
        }
    }

    totalFixedPnL += (fixedPnL || 0);

    return {
        currentQuantity,
        totalFixedPnL,
        averagePrice,
        averagePriceCorrected,
        sumUp,
        sumUpCorrected,
        fixedPnL,
    };
}

// #endregion