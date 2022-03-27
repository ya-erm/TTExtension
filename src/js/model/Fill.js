// @ts-check

/**
 * @typedef {(
 *   import("../types").Operation &
 *   {
 *     portfolioId: string,
 *     averagePrice?: number,
 *     averagePriceCorrected?: number,
 *     currentQuantity?: number,
 *     fixedPnL?: number,
 *     manual?: boolean
 *   }
 * )} Fill
 * @property {number?} averagePrice - средняя цена
 * @property {number?} averagePriceCorrected - средняя цена с учётом комиссии
 * @property {number?} currentQuantity - текущее количество в позиции
 * @property {number?} fixedPnL - зафиксированная прибыль
 * @property {boolean?} manual - true, если запись изменена вручную
 */

/**
 * Дата последней исполненной сделки внутри заявки
 * @param {Fill} fill
 * @returns {Date?}
 */
export function getFillLastTradeDate(fill) {
    if (fill.trades?.length > 0) {
        return new Date(fill.trades[fill.trades.length - 1].dateTime);
    }
}

/**
 * Сортировка операций по дате последней сделки
 * @param {Fill[]} fills
 */
export function sortFills(fills) {
    return (
        fills
            //.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // sort by order placed
            .sort((a, b) => {
                // sort by last trade executed or order creation if trades is unknown
                const aDate = getFillLastTradeDate(a) ?? new Date(a.date);
                const bDate = getFillLastTradeDate(b) ?? new Date(b.date);
                return aDate.getTime() - bDate.getTime();
            })
    );
}
