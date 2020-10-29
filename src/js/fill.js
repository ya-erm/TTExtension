export class Fill {
    constructor(item) {
        this.id = item.id;
        this.date = item.date;
        this.operationType = item.operationType;
        this.price = item.price;
        this.quantity = item.quantity;
        this.payment = item.payment;
        this.commission = item.commission?.value;
    }
}
