/**
 * @typedef Order

 * @property {string} orderId - Идентификатор заявки.
 * @property {OrderExecutionReportStatus} executionReportStatus - Текущий статус заявки.
 * @property {number} lotsRequested - Запрошено лотов.
 * @property {number} lotsExecuted - Исполнено лотов.
 * @property {import("./MoneyValue").MoneyValue} initialOrderPrice - Начальная цена заявки. Произведение количества запрошенных лотов на цену.
 * @property {import("./MoneyValue").MoneyValue} executedOrderPrice - Исполненная цена заявки. Произведение средней цены покупки на количество лотов.
 * @property {import("./MoneyValue").MoneyValue} totalOrderAmount - Итоговая стоимость заявки, включающая все комиссии.
 * @property {import("./MoneyValue").MoneyValue} averagePositionPrice - Средняя цена позиции по сделке.
 * @property {import("./MoneyValue").MoneyValue} initialCommission - Начальная комиссия. Комиссия, рассчитанная на момент подачи заявки.
 * @property {import("./MoneyValue").MoneyValue} executedCommission - Фактическая комиссия по итогам исполнения заявки.
 * @property {string} figi - Figi-идентификатор инструмента.
 * @property {OrderDirection} direction - Направление заявки.
 * @property {import("./MoneyValue").MoneyValue} initialSecurityPrice - Начальная цена инструмента. Цена инструмента на момент выставления заявки.
 * @property {OrderStage[]} stages - Стадии выполнения заявки.
 * @property {import("./MoneyValue").MoneyValue} serviceCommission - Сервисная комиссия.
 * @property {string} currency - Валюта заявки.
 * @property {OrderType} orderType - Тип заявки.
 * @property {import("./MoneyValue").Timestamp} orderDate - Дата и время выставления заявки в часовом поясе UTC.
 */

/**
 * @typedef {(
 *  'EXECUTION_REPORT_STATUS_UNSPECIFIED' |
 *  'EXECUTION_REPORT_STATUS_FILL' |
 *  'EXECUTION_REPORT_STATUS_REJECTED' |
 *  'EXECUTION_REPORT_STATUS_CANCELLED' |
 *  'EXECUTION_REPORT_STATUS_NEW' |
 *  'EXECUTION_REPORT_STATUS_PARTIALLYFILL
 * )} OrderExecutionReportStatus
 *
 * EXECUTION_REPORT_STATUS_UNSPECIFIED - Статус не определён
 * EXECUTION_REPORT_STATUS_FILL - Исполнена
 * EXECUTION_REPORT_STATUS_REJECTED - Отклонена
 * EXECUTION_REPORT_STATUS_CANCELLED - Отменена пользователем
 * EXECUTION_REPORT_STATUS_NEW - Новая
 * EXECUTION_REPORT_STATUS_PARTIALLYFILL - Частично исполнена
 */

/**
 * @typedef {(
 *  'ORDER_DIRECTION_UNSPECIFIED' |
 *  'ORDER_DIRECTION_BUY' |
 *  'ORDER_DIRECTION_SELL'
 * )} OrderDirection
 *
 * ORDER_DIRECTION_UNSPECIFIED - Направление не определёно
 * ORDER_DIRECTION_BUY - Покупка
 * ORDER_DIRECTION_SELL - Продажа
 */

/**
 * @typedef {(
 *  'ORDER_TYPE_UNSPECIFIED' |
 *  'ORDER_TYPE_MARKET' |
 *  'ORDER_TYPE_LIMIT'
 * )} OrderType
 *
 * ORDER_TYPE_UNSPECIFIED - Тип заявки не определён
 * ORDER_TYPE_MARKET - Рыночная заявка
 * ORDER_TYPE_LIMIT - Лимитная заявка
 */

/**
 * @typedef OrderStage
 * @property {MoneyValue} price - Цена.
 * @property {number} quantity - Количество лотов.
 * @property {string} tradeId - Идентификатор торговой операции.
 */

export {};
