/** @typedef {import('./storage/operationsRepository.js').Operation} Operation */

/** 
 * @class Fill
 * @property {string} id - идентификатор сделки
 * @property {string} date - дата и время в ISO8601, например "2021-02-10T11:18:27.276+03:00"
 * @property {string} operationType - тип операции, например "Buy"
 * @property {number} price - стоимость одного лота, например 100.21
 * @property {number?} quantity - количество лотов в заявке
 * @property {number?} quantityExecuted - количество исполненных лотов
 * @property {{currency: string, value: number}?} commission - комиссия, например {currency: "USD", value: -0.07}
 */
export class Fill {
    /**
     * @constructor
     * @param {Operation} item 
     */
    constructor(item) {
        this.id = item.id;
        this.date = item.date;
        this.operationType = item.operationType;
        this.price = item.price;
        this.quantity = item.quantity;
        this.quantityExecuted = item.quantityExecuted;
        this.payment = item.payment;
        this.commission = item.commission?.value;
    }
}
