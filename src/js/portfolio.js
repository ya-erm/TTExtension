import { processOperation } from "./calculate.js";
import { Fill } from "./fill.js";
import { Position, updatePosition } from "./position.js";
import instrumentsRepository from "./storage/instrumentsRepository.js";
import getOperationsRepository from "./storage/operationsRepository.js";
import { TTApi } from "./TTApi.js";

/** @typedef {import('./position.js').Position} Position */
/** @typedef {import('./storage/operationsRepository.js').Operation} Operation */

/** 
 * @class Portfolio
 * @property {string} id - идентификатор портфеля
 * @property {string} title - название портфеля
 * @property {string?} account - идентификатор счёта
 * @property {Array<Position>} positions - список позиций
 * @property {Object} fills - словарь сделок
 * @property {string} allDayPeriod - переключатель отображения прибыли (All, Day)
 * @property {string} priceChangeUnit - переключатель отображения изменения цены за день (Percents, Absolute)
 * @property {{field: string, ascending: boolean}?} sorting - параметры сортировки
 */
export class Portfolio {
    /**
     * @constructor
     * @param {string} title
     * @param {string} id
     */
    constructor(title, id) {
        this.id = id;
        this.title = title;
        this.account = undefined;
        this.positions = [];
        this.fills = {};
        this.allDayPeriod = "All"; // All | Day
        this.priceChangeUnit = "Percents"; // Percents | Absolute
    }

    /**
     * Сохранить портфель
     */
    save() {
        TTApi.savePortfolios();
    }

    // #region Positions

    /**
     * Загрузить позиции, используя API
     */
    async loadPositions() {
        if (!!this.account) {
            // Загружаем позиции
            const positions = await TTApi.loadPortfolio(this.account);
            this.updatePortfolio(positions);
            // Загружаем валютные позиции
            const currencies = await TTApi.loadCurrencies(this.account);
            this.updateCurrencies(currencies);
            // Просчитываем позиции по сделкам
            this.calculatePositions();

            // Узнаём текущую цену нулевых позиций
            // TODO: загружать стаканы только для избранных позиций, т.к. много запросов
            this.positions
                .filter(_ => _.count == 0)
                .forEach(async position => {
                    const orderbook = await TTApi.loadOrderbook(position.figi);
                    position.lastPrice = orderbook.lastPrice;
                    position.lastPriceUpdated = new Date();
                    window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
                });
        }

        return this.positions;
    }

    /**
     * Обновить позиции
     * @param {Array<PortfolioPosition>} items - список позиций
     */
    updatePortfolio(items) {
        const now = new Date();
        let created = 0;
        let updated = 0;
        items.forEach(item => {
            const lastPrice = item.expectedYield?.value / item.balance + item.averagePositionPrice?.value;
            // Находим существующую позицию в портфеле или создаём новую
            let position = this.positions.find(_ => _.figi === item.figi);
            if (!position) {
                position = new Position(this.id, item);
                this.positions.push(position);
                created++;
            }
            let changed = false;
            if (position.count !== item.balance) {
                position.count = item.balance;
                position.needCalc = true;
                changed = true;
            }
            position.lastPriceUpdated = now;
            if (position.lastPrice !== lastPrice) {
                position.lastPrice = lastPrice;
                position.expected = (position.lastPrice - position.average) * position.count;
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
        this.positions.sort(this.comparePositions);
    }

    /**
     * Сравнить две позиции
     * @param {Position} a 
     * @param {Position} b 
     */
    comparePositions(a, b) {
        if (a == undefined && b != undefined) { return 1; }
        if (a != undefined && b == undefined) { return -1; }
        if (a == undefined && b == undefined) { return 0; }
        // Сравнение по типу инструмента
        let compareByType = a.instrumentType.localeCompare(b.instrumentType);
        if (compareByType != 0) { return compareByType; }
        // Сравнение по количеству (zero/non-zero)
        if (a.count == 0 && b.count != 0) { return 1 };
        if (b.count == 0 && a.count != 0) { return -1 };
        // Сравнение по тикеру
        return a.ticker.localeCompare(b.ticker);
    }

    /**
     * Обновить валютные позиции
     * @param {Array<CurrencyPosition>} items 
     */
    updateCurrencies(items) {
        items.forEach(item => {
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
            let position = this.positions.find(_ => _.instrumentType == "Currency" && _.figi == item.figi);
            if (!position) {
                position = {
                    portfolioId: this.id,
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
                position.__proto__ = Position.prototype;
                this.positions.push(position);
            }
            if (position.count !== item.balance) {
                position.count = item.balance;
            }
            // Генерируем событие обновления позиции
            window.dispatchEvent(new CustomEvent("PositionUpdated", { detail: { position } }));
        });
        this.save();
    }

    /**
     * Просчитать для позиций среднюю стоимость и зафиксированную прибыль
     */
    async calculatePositions() {
        const needCalcPositions = this.positions.filter(_ => _.needCalc);
        console.log(`Calculating ${needCalcPositions.length} positions`);
        needCalcPositions.forEach(async position => {
            // Загружаем список операций по инструменту
            const operations = await TTApi.loadOperationsByFigi(position.figi, this.account);

            if (operations.length > 0) {
                getOperationsRepository(this.account).putMany(operations);
                this.updateFills(position, operations);
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
            const item = await TTApi.findInstrumentByFigi(figi);
            position = {
                ticker: item.ticker,
                name: item.name,
                figi: item.figi,
                isin: item.isin,
                count: 0,
                instrumentType: item.type,
                currency: item.currency,
                portfolioId: this.id,
            };
            position.__proto__ = Position.prototype;
        }
        return position;
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
        if (this.filter == undefined) { return true; }
        // Filter by currency
        if (this.filter?.currencies && this.filter.currencies[position.currency.toLowerCase()] == false) {
            return false;
        }
        // Filter by zero/non-zero
        if (this.filter?.zeroPositions?.zero == false && position.count == 0) {
            return false;
        }
        if (this.filter?.zeroPositions?.nonZero == false && position.count != 0) {
            return false;
        }
        return true;
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
            const item = await TTApi.loadInstrumentByTicker(ticker);
            if (!item) {
                throw new Error("Instrument not found");
            }
            figi = item.figi;
        }

        const operations = await TTApi.loadOperationsByFigi(figi, this.account);
        getOperationsRepository(this.account).putMany(operations);
        const position = await this.findPosition(figi);

        if (!this.positions.includes(position)) {
            this.positions.push(position);
            this.sortPositions();
        }

        this.updateFills(position, operations);

        return this.fills[ticker];
    }

    /**
     * Загрузить все операции
     */
    async loadOperations() {
        const operations = await TTApi.loadOperationsByFigi(undefined, this.account);
        getOperationsRepository(this.account).putMany(operations);
        return operations;
    }

    /**
     * Обновить список сделок и просчитать позиции
     * @param {Position} position - позиция
     * @param {Array<Operation>} operations - список операций
     */
    updateFills(position, operations) {
        let created = 0;
        let updated = 0;
        const fills = this.fills[position.ticker] || [];

        let currentQuantity = 0;
        let totalFixedPnL = 0;
        let averagePrice = 0;
        let averagePriceCorrected = 0;

        operations
            .filter(_ => _.status == "Done" && ["Buy", "BuyCard", "Sell"].includes(_.operationType))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(item => {
                let fill = fills.find(_ => _.id == item.id);
                if (!fill) {
                    fill = new Fill(item);
                    fills.push(fill);
                    created++;
                }

                if (fill.price != item.price ||
                    fill.commission != item.commission?.value) {
                    fill.price = item.price;
                    fill.commission = item.commission?.value;
                    updated++;
                }

                if (fill.quantity != item.quantity ||
                    fill.quantityExecuted != item.quantityExecuted) {
                    fill.quantity = item.quantity;
                    fill.quantityExecuted = item.quantityExecuted;
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

        console.log(`Fills ${position.ticker} created: ${created}, updated: ${updated}`)
        this.fills[position.ticker] = fills;
        this.save();

        position.calculatedCount = currentQuantity;
        if (position.count != currentQuantity) {
            console.warn("Calculated by fills position quantity", currentQuantity, "is not equal with actual position quantity", position.count);
        }

        // Обновляем позицию
        updatePosition(position, averagePrice, totalFixedPnL);
    }

    // #endregion
}
