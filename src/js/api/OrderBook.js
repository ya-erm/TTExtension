/**
 * @typedef OrderBookDto
 * 
 * @property {string} figi - Figi-идентификатор инструмента.
 * @property {number} depth - Глубина стакана.
 * @property {import("./Order").Order[]} bids - Множество пар значений на покупку.
 * @property {import("./Order").Quotation[]} asks - Множество пар значений на продажу.
 * @property {import("./Quotation").Quotation} lastPrice - Цена последней сделки за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. Для перевод цен в валюту рекомендуем использовать информацию со страницы.
 * @property {import("./Quotation").Quotation} closePrice - Цена закрытия за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. Для перевод цен в валюту рекомендуем использовать информацию со страницы.
 * @property {import("./Quotation").Quotation} limitUp - Верхний лимит цены за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. Для перевод цен в валюту рекомендуем использовать информацию со страницы.
 * @property {import("./Quotation").Quotation} limitDown - Нижний лимит цены за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. Для перевод цен в валюту рекомендуем использовать информацию со страницы.
 * @property {import("./Timestamp").Timestamp} lastPriceTs - Время получения цены последней сделки.
 * @property {import("./Timestamp").Timestamp} closePriceTs - Время получения цены закрытия.
 * @property {import("./Timestamp").Timestamp} orderbookTs - Время формирования стакана на бирже.
 * @property {string} instrumentUid - Uid инструмента.
 */

export {};