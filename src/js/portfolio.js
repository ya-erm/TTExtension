// @ts-check
import { findInstrumentByFigiAsync, loadOperationsByFigiAsync, loadPortfolioAsync } from "./data.js";
import { calcPriceChange, calcPriceChangePercents, processFill } from "./calculate.js";
import { toNumber } from "./mapping.js";
import { sortFills } from "./model/Fill.js";
import { Position, updatePosition } from "./model/Position.js";
import { savePortfolios } from "./storage.js";
import getFillsRepository, { FillsRepository } from "./storage/fillsRepository.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";
import getOperationsRepository, { OperationsRepository } from "./storage/operationsRepository.js";
import { TTApi } from "./TTApi.js";
import { TTApi2 } from "./TTApi2.js";
import { buySellOperations, EUR_FIGI, USD_FIGI } from "./utils.js";

/**
 * @typedef PortfolioFilter
 * @property {Object<string, boolean>} currencies
 * @property {{zero: boolean, nonZero: boolean}} zeroPositions
 */

/**
 * @typedef PortfolioSorting
 * @property {string?} field - поле сортировки
 * @property {boolean} ascending - true, если сортировка по возрастанию
 */

/**
 * @typedef PortfolioSettings
 * @property {'Percents'|'Absolute'} priceChangeUnit - переключатель отображения изменения цены за день (Percents, Absolute)
 * @property {'Percents'|'Absolute'} expectedUnit - переключатель отображения ожидаемой прибыли (Percents, Absolute)
 * @property {'All'|'Day'|'Week'|'Month'|'Year'} allDayPeriod - переключатель отображения прибыли (All, Day, Week, Month, Year)
 * @property {PortfolioFilter?} filter - параметры фильтрации
 * @property {PortfolioSorting?} sorting - параметры сортировки
 */

/** 
 * @class Portfolio
 */
export class Portfolio {
    /**
     * @constructor
     * @param {string} title - название портфеля
     * @param {string} id - идентификатор портфеля
     */
    constructor(title, id) {
        /** @type {string} идентификатор портфеля */
        this.id = id;

        /** @type {string} название портфеля */
        this.title = title;

        /** @type {string?} идентификатор счёта */
        this.account = undefined;

        /** @type {Position[]} список позиций*/
        this.positions = [];

        /** @type {PortfolioSettings} настройки портфеля */
        this.settings = undefined;

        this.fillMissingFields();
    }
    
    /** @type {FillsRepository} хранилище сделок */
    get fillsRepository() {
        return getFillsRepository(this.id)
    }
    
    /** @type {OperationsRepository} хранилище операций */
    get operationsRepository() {
        return getOperationsRepository(this.account)
    }

    /**
     * Заполнить недостающие поля
     */
    fillMissingFields() {
        if (this.settings == undefined) {
            this.settings = {
                allDayPeriod: "All",
                priceChangeUnit: "Percents",
                expectedUnit: "Absolute",
                filter: undefined,
                sorting: {
                    field: undefined,
                    ascending: true,
                }
            }
        }
        // @ts-ignore
        if (this.fills) { delete this.fills }
    }

    /**
     * Сохранить портфель
     */
    save() {
        savePortfolios();
    }

    // #region Positions

    /**
     * Загрузить позиции, используя API
     */
    async loadPositionsAsync() {
        if (!!this.account) {
            // Загружаем позиции
            const items = await loadPortfolioAsync(this.account);
            await this.updatePortfolioAsync(items);
            // Загружаем валютные позиции
            const currencies = await TTApi2.loadCurrenciesAsync(this.account);
            this.updateCurrencies(currencies);
            // Просчитываем позиции по сделкам
            this.calculatePositions();

            // Узнаём текущую цену нулевых позиций
            // TODO: загружать стаканы только для избранных позиций, т.к. много запросов
            // this.positions
            //     .filter(_ => _.count == 0)
            //     .forEach(async position => {
            //         const orderbook = await TTApi.loadOrderbookAsync(position.figi);
            //         position.lastPrice = orderbook.lastPrice;
            //         position.lastPriceUpdated = new Date();
            //         window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
            //     });
        }
    }

    /**
     * Обновить позиции
     * @param {import("./types.js").PortfolioPosition[]} items - список позиций
     */
    async updatePortfolioAsync(items) {
        const newPositions = items.filter(item => !this.positions.find(x => x.figi == item.figi))
        const instruments = await Promise.all(newPositions.map(item => findInstrumentByFigiAsync(item.figi)))
        const now = new Date();
        let created = 0;
        let updated = 0;
        items.forEach(item => {
            const averagePrice = item.averagePositionPrice
            const lastPrice = item.expectedYield / item.quantity + averagePrice
            // Находим существующую позицию в портфеле или создаём новую
            let position = this.positions.find(_ => _.figi === item.figi);
            if (!position) {
                const instrument = instruments.find(x => x.figi == item.figi)
                position = new Position(this.id, item, instrument);
                this.positions.push(position);
                created++;
            }
            let changed = false;
            if (position.count !== item.quantity) {
                position.count = item.quantity;
                position.needCalc = true;
                changed = true;
            }
            position.lastPriceUpdated = now;
            if (position.lastPrice !== lastPrice) {
                position.lastPrice = lastPrice;
                changed = true;
            }
            if (position.average != averagePrice) {
                position.average = averagePrice;
                changed = true;
            }
            if (position.expected != item.expectedYield) {
                position.calculatedExpected = (position.lastPrice - position.calculatedAverage) * position.calculatedCount;                changed = true;
                position.expected = item.expectedYield;
                if (position.currency == 'rub' && Math.abs(position.calculatedExpected - position.expected) > 100 ||
                    position.currency != 'rub' && Math.abs(position.calculatedExpected - position.expected) > 1) {
                    position.needCalc = true;
                }
                changed = true;
            }
            if (changed) {
                updated++;
            }
        });
        // Обнуляем позиции, которых больше нет среди новых позиций
        this.positions
            .filter(position => position.count != 0 && position.ticker != "RUB" && !items.find(_ => _.figi == position.figi))
            .forEach(item => {
                item.count = 0;
                item.expected = undefined;
                item.lastPrice = undefined;
                item.lastPriceUpdated = new Date();
                item.needCalc = true;
                updated++;
            });
        // Сортируем позиции
        this.sortPositions();
        this.save();

        console.log(`Positions created: ${created}, updated: ${updated}`)
    }

    /**
     * Отсортировать позиции
     */
    sortPositions() {
        const comparer = this.getComparer()
        this.positions.sort(comparer);
    }

    /**
     * Получить компаратор для сравнения двух позиций
     * @returns {(a: Position, b: Position) => number}
     */
    getComparer() {
        /**
        * Сравнение с undefined
        * @param {(a: Position, b: Position) => number} comparer
        * @returns {(a: Position, b: Position) => number}
        */
        const withNull = (comparer) => {
            return (a, b) => {
                if (a == undefined && b != undefined) { return 1; }
                if (a != undefined && b == undefined) { return -1; }
                if (a == undefined && b == undefined) { return 0; }
                return comparer(a, b);
            }
        };

        /**
        * С учётом сортировки
        * @param {(a: Position, b: Position) => number} comparer
        * @returns {(a: Position, b: Position) => number}
        */
        const withAsc = (comparer) => {
            return (this.settings.sorting?.ascending ?? true)
                ? (a, b) => comparer(a, b)
                : (a, b) => comparer(b, a);
        };

        /** @type {(a: Position, b: Position) => number}  */
        let defaultComparer = (a, b) => {
            // Сравнение по типу инструмента
            let compareByType = a.instrumentType.localeCompare(b.instrumentType);
            if (compareByType != 0) { return compareByType; }
            // Сравнение по избранному
            if (!a.isFavourite && b.isFavourite) { return 1 };
            if (!b.isFavourite && a.isFavourite) { return -1 };
            if (a.isFavourite && b.isFavourite) { 
                return a.ticker.localeCompare(b.ticker) 
            };
            // Сравнение по количеству (zero/non-zero)
            if (a.count == 0 && b.count != 0) { return 1 };
            if (b.count == 0 && a.count != 0) { return -1 };
            // Сравнение по тикеру
            return a.ticker.localeCompare(b.ticker);
        }

        /** @type {(position: Position) => number} Селектор */
        let fieldSelector = (_) => undefined;

        const sort = this.settings.sorting.field ?? "default";
        switch (sort) {
            case "ticker":
                return withAsc((a, b) => a.ticker.localeCompare(b.ticker));
            case "count":
                fieldSelector = (position) => position.count;
                break;
            case "average":
                fieldSelector = (position) => position.average;
                break;
            case "lastPrice":
                fieldSelector = (position) => position.lastPrice;
                break;
            case "cost":
                fieldSelector = (position) => position.lastPrice ? position.count * position.lastPrice : undefined;
                break;
            case "expected":
                fieldSelector = (position) => position.expected ? position.expected : undefined;
                break;
            case "fixed":
                fieldSelector = (position) => position.fixedPnL ? position.fixedPnL : undefined;
                break;
            case "change":
                fieldSelector =
                    this.settings.priceChangeUnit == "Percents"
                        ? (p) => {
                            if (p.previousDayPrice && p.lastPrice) {
                                const change = calcPriceChangePercents(p.previousDayPrice, p.lastPrice);
                                return change ? change : undefined;
                            }
                            return undefined;
                        }
                        : (p) => {
                            if (p.previousDayPrice && p.lastPrice) {
                                const change = calcPriceChange(p.previousDayPrice, p.lastPrice);
                                return Math.abs(change) < 0.01 ? undefined : change;
                            }
                            return undefined;
                        }
                break;
            default:
                return withAsc(defaultComparer);
        }

        /** @type {(asc: boolean) => (a: Position, b: Position) => number}  */
        const comparer = (asc) => (p1, p2) => {
            const a = fieldSelector(p1);
            const b = fieldSelector(p2);

            if (a == undefined && b != undefined) { return 1; }
            if (a != undefined && b == undefined) { return -1; }
            if (a == undefined && b == undefined) { return 0; }

            return asc ? a - b : b - a;
        }

        return comparer(this.settings.sorting.ascending);
    }

    /**
     * Обновить валютные позиции
     * @param {import("./types").MoneyValue[]} items
     */
    updateCurrencies(items) {
        items.forEach(item => {
            const balance = toNumber(item)
            let name, figi, ticker, lastPrice, average;
            switch (item.currency) {
                case "usd":
                    name = "Доллар США";
                    figi = USD_FIGI;
                    ticker = "USD000UTSTOM";
                    break;
                case "eur":
                    name = "Евро";
                    figi = EUR_FIGI;
                    ticker = "EUR_RUB__TOM";
                    break;
                case "rub":
                    name = "Рубли РФ";
                    figi = "RUB";
                    ticker = item.currency;
                    lastPrice = 1;
                    average = 1;
                    break;
                default:
                    name = item.currency;
                    figi = item.currency;
                    ticker = item.currency;
                    break;
            }
            let position = this.positions.find(_ => _.instrumentType == "currency" && _.figi == figi);
            if (!position) {
                if (balance == 0) { return; }
                position = new Position(this.id, {
                    figi,
                    instrumentType: "currency",
                    quantity: balance,
                    quantityLots: balance,
                }, {
                    isin: undefined,
                    currency: 'rub',
                    ticker,
                    name,
                });
                position.lastPrice = lastPrice;
                position.average = average;
                this.positions.push(position);
            }
            if (position.count !== balance) {
                position.count = balance;
            }
            // Генерируем событие обновления позиции
            window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
        });
    }

    /**
     * Просчитать для позиций среднюю стоимость и зафиксированную прибыль
     */
    async calculatePositions() {
        const now = new Date();
        // TODO: Ограничить значение 'from' если будут проблемы из-за слишком большого объёма данных
        // const lastYear = new Date(now.setFullYear(now.getFullYear() - 1));
        const operations = await loadOperationsByFigiAsync(undefined, this.account, undefined);
        this.positions.forEach(async position => {
            const positionOperations = operations.filter(x => x.figi == position.figi);
            if (positionOperations.length > 0) {
                this.operationsRepository.putMany(positionOperations);
                await this.updateFills(position, positionOperations);
            }
        });
    }

    /**
     * Поиск или создание позиции
     * @param {string} figi идентификатор
     */
    async findPosition(figi) {
        let position = this.positions.find(_ => _.figi == figi);
        if (!position) {
            const item = await findInstrumentByFigiAsync(figi);
            position = new Position(this.id, {
                figi: item.figi,
                instrumentType: item.type,
                quantity: 0,
                quantityLots: 0,
                expectedYield: undefined,
                averagePositionPrice: undefined,
                averagePositionPriceFifo: undefined,
                averagePositionPricePt: undefined,
                currentNkd: undefined,
                currentPrice: undefined,
                currency: item.currency,
            }, {
                ticker: item.ticker,
                isin: item.isin,
                name: item.name,
                currency: item.currency,
            });
        }
        return position;
    }
    
    /**
     * Добавление позиции в список позиций
     * @param {Position} position 
     */
    addPosition(position) {
        if (!this.positions.includes(position)) {
            this.positions.push(position);
        }
    }

    /**
     * Удалить позицию из списка позиций
     * @param {Position} position - позиция
     */
    removePosition(position) {
        if (position.count != 0) {
            console.log(`Failed to remove non-zero position ${position.ticker}`);
            return;
        }
        const index = this.positions.indexOf(position);
        if (index >= 0) {
            this.positions.splice(index, 1)
            window.dispatchEvent(new CustomEvent("PositionRemoved", { detail: { position } }));
            this.save();
        } else {
            console.log(`Failed to remove position ${position.ticker}, it's not found`);
        }
    }

    /**
     * Проверить позицию на соответствие фильтру
     * @param {Position} position - позиция
     * @returns {boolean} true, если позиция соответствует фильтру
     */
    filterPosition(position) {
        if (this.settings.filter == undefined) { return true; }
        // Filter by currency
        if (this.settings.filter?.currencies && this.settings.filter.currencies[position.currency.toLowerCase()] == false) {
            return false;
        }
        // Filter by zero/non-zero
        if (this.settings.filter?.zeroPositions?.zero == false && position.count == 0) {
            return false;
        }
        if (this.settings.filter?.zeroPositions?.nonZero == false && position.count != 0) {
            return false;
        }
        return true;
    }

    // #endregion

    // #region Orders

    /**
     * Загрузить заявки
     * @param {string} figi - идентификатор
     */
    async loadOrdersByFigi(figi) {
        const orders = await TTApi2.loadOrdersByFigiAsync(figi, this.account);
        return orders;
    }


    // #endregion

    // #region Fills

    /**
     * Загрузить сделки
     * @param {string} ticker - идентификатор
     */
    async loadFillsByTicker(ticker) {
        let figi = this.positions.find(_ => _.ticker == ticker)?.figi
            || (await instrumentsRepository.getOneByTicker(ticker))?.figi;

        if (!figi) {
            const item = await TTApi.loadInstrumentByTickerAsync(ticker);
            if (!item) {
                throw new Error("Instrument not found");
            }
            figi = item.figi;
        }

        const operations = await loadOperationsByFigiAsync(figi, this.account);
        await this.operationsRepository.putMany(operations);
        const position = await this.findPosition(figi);
        this.addPosition(position);
        this.sortPositions();

        return await this.updateFills(position, operations);
    }

    /**
     * Загрузить все операции
     * @returns {Promise<import("./types.js").Operation[]>}
     */
    async loadOperationsAsync() {
        const operations = await loadOperationsByFigiAsync(undefined, this.account)
        this.operationsRepository.putMany(operations);
        return operations;
    }

    /**
     * Обновить список сделок и просчитать позиции
     * @param {Position} position - позиция
     * @param {import("./types.js").Operation[]} operations - список операций
     * @returns {Promise<import("./types.js").Fill[]>}
     */
    async updateFills(position, operations) {
        let created = 0;
        let updated = 0;
        let fills = await this.fillsRepository.getAllByFigi(position.figi) || [];

        operations
            .filter(operation => operation.status == "OPERATION_STATE_EXECUTED" && buySellOperations.includes(operation.operationType))
            .forEach(operation => {
                let fill = fills.find(_ => _.id == operation.id);
                if (!fill) {
                    fill = { ...operation, portfolioId: this.id}
                    fills.push(fill);
                    created++;
                }
                // Не обновляем данные сделки, если она была исправлена вручную
                if (fill.manual) { return; }

                let fillUpdated = false;
                if (fill.price != operation.price ) {
                    fill.price = operation.price;
                    fillUpdated = true;
                }
                if (fill.lotsRequested != operation.lotsRequested ||
                    fill.lotsExecuted != operation.lotsExecuted) {
                    fill.lotsRequested = operation.lotsRequested;
                    fill.lotsExecuted = operation.lotsExecuted;
                    fillUpdated = true;
                }
                if (fill.trades?.length != operation.trades?.length) {
                    fill.trades = operation.trades;
                    fillUpdated = true;
                }
                if (fill.payment != operation.payment) {
                    fill.payment = operation.payment;
                    fillUpdated = true;
                }
                if (fillUpdated) {
                    updated++;
                }
            });


        let currentQuantity = 0;
        let totalFixedPnL = 0;
        let averagePrice = 0;
        let averagePriceCorrected = 0;

        fills = sortFills(fills)
        
        if (created == 0 && updated == 0) {
            return fills;
        }

        fills
            .forEach(fill => {
                const result = processFill({
                    currentQuantity,
                    totalFixedPnL,
                    averagePrice,
                    averagePriceCorrected
                }, fill);

                currentQuantity = result.currentQuantity;
                totalFixedPnL = result.totalFixedPnL;
                averagePrice = result.averagePrice;
                averagePriceCorrected = result.averagePriceCorrected;

                fill.averagePrice = averagePrice;
                fill.averagePriceCorrected = averagePriceCorrected;
                fill.currentQuantity = currentQuantity
                fill.fixedPnL = result.fixedPnL;
            });

        console.log(`Fills ${position.ticker} created: ${created}, updated: ${updated}`)
        
        await this.fillsRepository.putMany(fills);

        position.calculatedCount = currentQuantity;
        if (position.count != currentQuantity) {
            console.warn(`${position.ticker}: Calculated by fills position quantity ${currentQuantity} is not equal with actual position quantity ${position.count}`);
        }

        // Обновляем позицию
        updatePosition(position, averagePrice, totalFixedPnL);
        this.save();

        return fills;
    }

    // #endregion
}
