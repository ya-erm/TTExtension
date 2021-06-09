// @ts-check
/** 
 * @class Fill
 */
export class Fill {
    /**
     * @constructor
     * @param {import("./TTApi").Operation} item 
     */
    constructor(item) {
        /** @type {string} идентификатор сделки */
        this.id = item.id;

        /** @type {string} дата и время в ISO8601, например "2021-02-10T11:18:27.276+03:00" */
        this.date = item.date;

        /** @type {string} тип операции, например "Buy" */
        this.operationType = item.operationType;

        /** @type {number} стоимость одного лота, например 100.21 */
        this.price = item.price;

        /** @type {number?} количество лотов в заявке */
        this.quantity = item.quantity;

        /** @type {number?} количество исполненных лотов */
        this.quantityExecuted = item.quantityExecuted;

        /** @type {number} сумма платежа */
        this.payment = item.payment;

        /** @type {number?} комиссия, например {currency: "USD", value: -0.07} */
        this.commission = item.commission?.value;

        /** @type {Array} */
        this.trades = item.trades

        // Расчётные накопительные параметры:

        /** @type {number?} средняя цена */
        this.averagePrice = undefined;

        /** @type {number?} средняя цена с учётом комиссии */
        this.averagePriceCorrected = undefined;

        /** @type {number?} текущее количество в позиции */
        this.currentQuantity = undefined;

        /** @type {number?} зафиксированная прибыль */
        this.fixedPnL = undefined;
    }

    /**
     * @param {import("./TTApi").Operation} operation 
     * @returns {Date}
     */
    static getLastTradeDate(operation) {
        if (operation.trades?.length > 0) {
            return new Date(operation.trades[operation.trades.length - 1].date)
        }
        return new Date(operation.date);
    }
}
