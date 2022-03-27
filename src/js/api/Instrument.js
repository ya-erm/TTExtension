/**
 * @typedef InstrumentDto
 *
 * @property {string} figi - Figi-идентификатор инструмента.
 * @property {string} ticker - Тикер инструмента.
 * @property {string} classCode - Класс-код инструмента.
 * @property {string} isin - Isin-идентификатор инструмента.
 * @property {number} lot - Лотность инструмента. Возможно совершение операций только на количества ценной бумаги, кратные параметру lot. Подробнее: лот
 * @property {import("./MoneyValue").Currency} currency - Валюта расчётов.
 * @property {import("./Quotation").Quotation?} klong - Коэффициент ставки риска длинной позиции по инструменту.
 * @property {import("./Quotation").Quotation?} kshort - Коэффициент ставки риска короткой позиции по инструменту.
 * @property {import("./Quotation").Quotation?} dlong - Ставка риска минимальной маржи в лонг. Подробнее: ставка риска в лонг
 * @property {import("./Quotation").Quotation?} dshort - Ставка риска минимальной маржи в шорт. Подробнее: ставка риска в шорт
 * @property {import("./Quotation").Quotation?} dlongMin - Ставка риска начальной маржи в лонг. Подробнее: ставка риска в лонг
 * @property {import("./Quotation").Quotation?} dshortMin - Ставка риска начальной маржи в шорт. Подробнее: ставка риска в шорт
 * @property {bool} shortEnabledFlag - Признак доступности для операций в шорт.
 * @property {string} name - Название инструмента.
 * @property {string} exchange - Торговая площадка.
 * @property {string} countryOfRisk - Код страны риска, т.е. страны, в которой компания ведёт основной бизнес.
 * @property {string} countryOfRiskName - Наименование страны риска, т.е. страны, в которой компания ведёт основной бизнес.
 * @property {InstrumentType} instrumentType - Тип инструмента.
 * @property {SecurityTradingStatus} tradingStatus - Текущий режим торгов инструмента.
 * @property {bool} otcFlag - Признак внебиржевой ценной бумаги.
 * @property {bool} buyAvailableFlag - Признак доступности для покупки.
 * @property {bool} sellAvailableFlag - Признак доступности для продажи.
 * @property {import("./Quotation").Quotation} minPriceIncrement - Шаг цены.
 * @property {bool} apiTradeAvailableFlag - Признак доступности торгов через API.
 */

/**
 * @typedef {('share' | 'etf' | 'bond' | 'currency' | 'futures' )} InstrumentType - Тип инструмента
 */

/**
 * @typedef {(
 * 'SECURITY_TRADING_STATUS_UNSPECIFIED' |
 * 'SECURITY_TRADING_STATUS_NOT_AVAILABLE_FOR_TRADING' |
 * 'SECURITY_TRADING_STATUS_OPENING_PERIOD' |
 * 'SECURITY_TRADING_STATUS_CLOSING_PERIOD' |
 * 'SECURITY_TRADING_STATUS_BREAK_IN_TRADING' |
 * 'SECURITY_TRADING_STATUS_NORMAL_TRADING' |
 * 'SECURITY_TRADING_STATUS_CLOSING_AUCTION' |
 * 'SECURITY_TRADING_STATUS_DARK_POOL_AUCTION' |
 * 'SECURITY_TRADING_STATUS_DISCRETE_AUCTION' |
 * 'SECURITY_TRADING_STATUS_OPENING_AUCTION_PERIOD' |
 * 'SECURITY_TRADING_STATUS_TRADING_AT_CLOSING_AUCTION_PRICE' |
 * 'SECURITY_TRADING_STATUS_SESSION_ASSIGNED' |
 * 'SECURITY_TRADING_STATUS_SESSION_CLOSE' |
 * 'SECURITY_TRADING_STATUS_SESSION_OPEN' |
 * 'SECURITY_TRADING_STATUS_DEALER_NORMAL_TRADING' |
 * 'SECURITY_TRADING_STATUS_DEALER_BREAK_IN_TRADING' |
 * 'SECURITY_TRADING_STATUS_DEALER_NOT_AVAILABLE_FOR_TRADING'
 * )} SecurityTradingStatus
 *
 * SECURITY_TRADING_STATUS_UNSPECIFIED - Торговый статус не определён
 * SECURITY_TRADING_STATUS_NOT_AVAILABLE_FOR_TRADING - Недоступен для торгов
 * SECURITY_TRADING_STATUS_OPENING_PERIOD - Период открытия торгов
 * SECURITY_TRADING_STATUS_CLOSING_PERIOD - Период закрытия торгов
 * SECURITY_TRADING_STATUS_BREAK_IN_TRADING - Перерыв в торговле
 * SECURITY_TRADING_STATUS_NORMAL_TRADING - Нормальная торговля
 * SECURITY_TRADING_STATUS_CLOSING_AUCTION - Аукцион закрытия
 * SECURITY_TRADING_STATUS_DARK_POOL_AUCTION - Аукцион крупных пакетов
 * SECURITY_TRADING_STATUS_DISCRETE_AUCTION - Дискретный аукцион
 * SECURITY_TRADING_STATUS_OPENING_AUCTION_PERIOD - Аукцион открытия
 * SECURITY_TRADING_STATUS_TRADING_AT_CLOSING_AUCTION_PRICE - Период торгов по цене аукциона закрытия
 * SECURITY_TRADING_STATUS_SESSION_ASSIGNED - Сессия назначена
 * SECURITY_TRADING_STATUS_SESSION_CLOSE - Сессия закрыта
 * SECURITY_TRADING_STATUS_SESSION_OPEN - Сессия открыта
 * SECURITY_TRADING_STATUS_DEALER_NORMAL_TRADING - Доступна торговля в режиме внутренней ликвидности брокера
 * SECURITY_TRADING_STATUS_DEALER_BREAK_IN_TRADING - Перерыв торговли в режиме внутренней ликвидности брокера
 * SECURITY_TRADING_STATUS_DEALER_NOT_AVAILABLE_FOR_TRADING - Недоступна торговля в режиме внутренней ликвидности брокера
 */

export {};
