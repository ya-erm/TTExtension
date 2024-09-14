/**
 * @typedef OperationDto
 *
 * @property {string} id - Идентификатор операции
 * @property {string} parentOperationId - Идентификатор родительской операции
 * @property {import("../types").Currency} currency - Валюта операции
 * @property {import("../types").MoneyValue} payment - Сумма операции
 * @property {import("../types").MoneyValue} price - Цена операции
 * @property {OperationState} state - Статус операции
 * @property {number} quantity - Количество лотов инструмента
 * @property {number} quantityRest - Неисполненный остаток по сделке
 * @property {string} figi - Figi-идентификатор инструмента, связанного с операцией
 * @property {InstrumentType} instrumentType - Тип инструмента.
 * @property {Timestamp} date - Дата и время операции в формате часовом поясе UTC
 * @property {string} type - Текстовое описание типа операции
 * @property {OperationType} operationType - Тип операции
 * @property {Trade[]} trades -	Массив сделок
 */

/**
 * @typedef Trade
 *
 * @property {string} tradeId - Идентификатор сделки
 * @property {Timestamp} dateTime - Дата и время сделки в часовом поясе UTC
 * @property {number} quantity - Количество
 * @property {import("./MoneyValue").MoneyValue} price - Цена
 */

/**
 * @typedef {(
 *  'OPERATION_STATE_UNSPECIFIED' |
 *  'OPERATION_STATE_EXECUTED' |
 *  'OPERATION_STATE_CANCELED'
 * )} OperationState
 *
 * OPERATION_STATE_UNSPECIFIED - Статус операции не определён
 * OPERATION_STATE_EXECUTED - Исполнена
 * OPERATION_STATE_CANCELED - Отменена
 */

/**
 * @typedef {(
 * 'OPERATION_TYPE_UNSPECIFIED' |
 * 'OPERATION_TYPE_INPUT' |
 * 'OPERATION_TYPE_BOND_TAX' |
 * 'OPERATION_TYPE_OUTPUT_SECURITIES' |
 * 'OPERATION_TYPE_OVERNIGHT' |
 * 'OPERATION_TYPE_TAX' |
 * 'OPERATION_TYPE_BOND_REPAYMENT_FULL' |
 * 'OPERATION_TYPE_SELL_CARD' |
 * 'OPERATION_TYPE_DIVIDEND_TAX' |
 * 'OPERATION_TYPE_OUTPUT' |
 * 'OPERATION_TYPE_BOND_REPAYMENT' |
 * 'OPERATION_TYPE_TAX_CORRECTION' |
 * 'OPERATION_TYPE_SERVICE_FEE' |
 * 'OPERATION_TYPE_BENEFIT_TAX' |
 * 'OPERATION_TYPE_MARGIN_FEE' |
 * 'OPERATION_TYPE_BUY' |
 * 'OPERATION_TYPE_BUY_CARD' |
 * 'OPERATION_TYPE_INPUT_SECURITIES' |
 * 'OPERATION_TYPE_SELL_MARGIN' |
 * 'OPERATION_TYPE_BROKER_FEE' |
 * 'OPERATION_TYPE_BUY_MARGIN' |
 * 'OPERATION_TYPE_DIVIDEND' |
 * 'OPERATION_TYPE_SELL' |
 * 'OPERATION_TYPE_COUPON' |
 * 'OPERATION_TYPE_SUCCESS_FEE' |
 * 'OPERATION_TYPE_DIVIDEND_TRANSFER' |
 * 'OPERATION_TYPE_ACCRUING_VARMARGIN' |
 * 'OPERATION_TYPE_WRITING_OFF_VARMARGIN' |
 * 'OPERATION_TYPE_DELIVERY_BUY' |
 * 'OPERATION_TYPE_DELIVERY_SELL' |
 * 'OPERATION_TYPE_TRACK_MFEE' |
 * 'OPERATION_TYPE_TRACK_PFEE' |
 * 'OPERATION_TYPE_TAX_PROGRESSIVE' |
 * 'OPERATION_TYPE_BOND_TAX_PROGRESSIVE' |
 * 'OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE' |
 * 'OPERATION_TYPE_BENEFIT_TAX_PROGRESSIVE' |
 * 'OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE' |
 * 'OPERATION_TYPE_TAX_REPO_PROGRESSIVE' |
 * 'OPERATION_TYPE_TAX_REPO' |
 * 'OPERATION_TYPE_TAX_REPO_HOLD' |
 * 'OPERATION_TYPE_TAX_REPO_REFUND' |
 * 'OPERATION_TYPE_TAX_REPO_HOLD_PROGRESSIVE' |
 * 'OPERATION_TYPE_TAX_REPO_REFUND_PROGRESSIVE' |
 * 'OPERATION_TYPE_DIV_EXT' |
 * 'OPERATION_TYPE_TAX_CORRECTION_COUPON'
 * )} OperationType
 *
 * OPERATION_TYPE_UNSPECIFIED - Тип операции не определён
 * OPERATION_TYPE_INPUT - Завод денежных средств
 * OPERATION_TYPE_BOND_TAX - Удержание налога по купонам
 * OPERATION_TYPE_OUTPUT_SECURITIES - Вывод ЦБ
 * OPERATION_TYPE_OVERNIGHT - Доход по сделке РЕПО овернайт
 * OPERATION_TYPE_TAX - Удержание налога
 * OPERATION_TYPE_BOND_REPAYMENT_FULL - Полное погашение облигаций
 * OPERATION_TYPE_SELL_CARD - Продажа ЦБ с карты
 * OPERATION_TYPE_DIVIDEND_TAX - Удержание налога по дивидендам
 * OPERATION_TYPE_OUTPUT - Вывод денежных средств
 * OPERATION_TYPE_BOND_REPAYMENT - Частичное погашение облигаций
 * OPERATION_TYPE_TAX_CORRECTION - Корректировка налога
 * OPERATION_TYPE_SERVICE_FEE - Удержание комиссии за обслуживание брокерского счёта
 * OPERATION_TYPE_BENEFIT_TAX - Удержание налога за материальную выгоду
 * OPERATION_TYPE_MARGIN_FEE - Удержание комиссии за непокрытую позицию
 * OPERATION_TYPE_BUY - Покупка ЦБ
 * OPERATION_TYPE_BUY_CARD - Покупка ЦБ с карты
 * OPERATION_TYPE_INPUT_SECURITIES - Завод ЦБ
 * OPERATION_TYPE_SELL_MARGIN - Продажа в результате Margin-call
 * OPERATION_TYPE_BROKER_FEE - Удержание комиссии за операцию
 * OPERATION_TYPE_BUY_MARGIN - Покупка в результате Margin-call
 * OPERATION_TYPE_DIVIDEND - Выплата дивидендов
 * OPERATION_TYPE_SELL - Продажа ЦБ
 * OPERATION_TYPE_COUPON - Выплата купонов
 * OPERATION_TYPE_SUCCESS_FEE - Удержание комиссии SuccessFee
 * OPERATION_TYPE_DIVIDEND_TRANSFER - Передача дивидендного дохода
 * OPERATION_TYPE_ACCRUING_VARMARGIN - Зачисление вариационной маржи
 * OPERATION_TYPE_WRITING_OFF_VARMARGIN - Списание вариационной маржи
 * OPERATION_TYPE_DELIVERY_BUY - Покупка в рамках экспирации фьючерсного контракта
 * OPERATION_TYPE_DELIVERY_SELL - Продажа в рамках экспирации фьючерсного контракта
 * OPERATION_TYPE_TRACK_MFEE - Комиссия за управление по счёту автоследования
 * OPERATION_TYPE_TRACK_PFEE - Комиссия за результат по счёту автоследования
 * OPERATION_TYPE_TAX_PROGRESSIVE - Удержание налога по ставке 15%
 * OPERATION_TYPE_BOND_TAX_PROGRESSIVE - Удержание налога по купонам по ставке 15%
 * OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE - Удержание налога по дивидендам по ставке 15%
 * OPERATION_TYPE_BENEFIT_TAX_PROGRESSIVE - Удержание налога за материальную выгоду по ставке 15%
 * OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE - Корректировка налога по ставке 15%
 * OPERATION_TYPE_TAX_REPO_PROGRESSIVE - Удержание налога за возмещение по сделкам РЕПО по ставке 15%
 * OPERATION_TYPE_TAX_REPO - Удержание налога за возмещение по сделкам РЕПО
 * OPERATION_TYPE_TAX_REPO_HOLD - Удержание налога по сделкам РЕПО
 * OPERATION_TYPE_TAX_REPO_REFUND - Возврат налога по сделкам РЕПО
 * OPERATION_TYPE_TAX_REPO_HOLD_PROGRESSIVE - Удержание налога по сделкам РЕПО по ставке 15%
 * OPERATION_TYPE_TAX_REPO_REFUND_PROGRESSIVE - Возврат налога по сделкам РЕПО по ставке 15%
 * OPERATION_TYPE_DIV_EXT - Выплата дивидендов на карту
 * OPERATION_TYPE_TAX_CORRECTION_COUPON - Корректировка налога по купонам
 */

export { };
