// @ts-check

import { toNumber } from "./mapping.js";

/**
 * Конвертация строкового представления валюты в символ
 * @param {string} currency Валюта (RUB, USD, EUR)
 */
export function printCurrency(currency) {
    if (!currency) {
        return "";
    }
    switch (currency.toUpperCase()) {
        case "RUB":
            return "₽";
        case "USD":
            return "$";
        case "EUR":
            return "€";
        case "GBP":
            return "£";
        case "TRY":
            return "₺";
        case "CHF":
            return "₣";
        case "JPY":
            return "¥";
        case "CNY":
            return "元";
        default:
            return currency;
    }
}

/** @type {import("./types.js").OperationType[]} */
export const buySellOperations = [
    "OPERATION_TYPE_BUY",
    "OPERATION_TYPE_SELL",
    "OPERATION_TYPE_BUY_CARD",
    "OPERATION_TYPE_SELL_CARD",
];

/** @type {import("./types.js").OperationType[]} */
export const dividendOperations = [
    "OPERATION_TYPE_COUPON",
    "OPERATION_TYPE_DIVIDEND",
    "OPERATION_TYPE_DIVIDEND_TAX",
];

export const USD_FIGI = "BBG0013HGFT4";
export const EUR_FIGI = "BBG0013HJJ31";
export const TCS_FIGI = "BBG005DXJS36";
export const TCSG_FIGI = "BBG00QPYJ5H0";

/**
 * Отображение денежного значения
 * @param {number} value Числовое значение
 * @param {string} currency Валюта
 * @param {boolean} withSign true, если нужно добавить знак + перед положительным значением
 * @param {number} precision Количество знаков после запятой
 */
export function printMoney(value, currency, withSign = false, precision = 2) {
    if (value == null || value == undefined || isNaN(value)) {
        return "";
    }
    const sign = withSign && value > 0 ? "+" : "";
    const parts = value.toFixed(precision).split(".");
    const fractionalPart = parts.length > 1 ? "." + parts[1] : "";
    return `${sign}${parts[0].replace(
        /\B(?=(\d{3})+(?!\d))/g,
        " "
    )}${fractionalPart} ${printCurrency(currency)}`;
}

/**
 * CSS-класс цвета денежного значения (красный, зеленый)
 * @param {number} value Числовое денежное значение
 */
export function getMoneyColorClass(value) {
    if (value > 0) return "text-success";
    if (value < 0) return "text-danger";
    return "";
}

/**
 * Отображение значения с множителем К, М (например 9.75К, 75.5K, 1.54M)
 * @param {number} value Числовое значение
 */
export function printVolume(value) {
    if (value == null || value == undefined || isNaN(value)) {
        return "";
    }
    if (Math.abs(value) <= 1000) {
        return `${value}`;
    } else if (Math.abs(value) < 10_000) {
        return `${(value / 1_000).toFixed(2)}K`;
    } else if (Math.abs(value) < 100_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    } else if (Math.abs(value) < 1_000_000) {
        return `${(value / 1_000).toFixed(0)}K`;
    } else {
        return `${(value / 1_000_000).toFixed(2)}M`;
    }
}

/**
 * Конвертация типа инструмента в название группы
 * @param {import("./types.js").InstrumentType} type Тип инструмента
 */
export function printInstrumentTypeGroup(type) {
    switch (type) {
        case "share":
            return "Stocks";
        case "bond":
            return "Bonds";
        case "etf":
            return "ETFs";
        case "futures":
            return "Futures";
        case "currency":
            return "Currencies";
        default:
            return type;
    }
}

/**
 * Включить/выключить CSS класс для элемента по условию
 * @param {object} element - HTML элемент
 * @param {string} className - Название класса
 * @param {boolean} condition - Условие, при выполнении которого класс будет применён
 */
export function setClassIf(element, className, condition) {
    try {
        if (!className) {
            return;
        }
        if (!condition && element.classList.contains(className)) {
            element.classList.remove(className);
        } else if (condition && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    } catch (error) {
        console.error(
            "Error in setClassIf on element",
            element,
            "\n",
            { className, condition },
            "\n",
            error
        );
    }
}

/**
 * Преобразовать строку к "безопасному" виду, содержащему только A-Z, a-z, 0-9, -, _
 * @param {string} text
 */
export function convertToSlug(text) {
    return text.replace(/ /g, "-").replace(/[^\w-]+/g, "_");
}

/**
 * Отображение даты
 * @param {Date | String} date
 */
export function printDate(date) {
    if (!!date && typeof date != typeof Date) {
        date = new Date(date);
    }
    var options = {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    };
    // @ts-ignore
    return date?.toLocaleDateString("ru-RU", options);
}

/**
 * Текстовое представление сделки
 * @param {import("./types.js").Trade} trade
 */
export function printTrade(trade) {
    const tradePrice = toNumber(trade.price)?.toFixed(2);
    return `${trade.quantity} x ${tradePrice} ${printDate(trade.dateTime)}`;
}

/**
 * Сравнение версий
 * @param {string} a - версия 1
 * @param {string} b - версия 2
 * @returns {number} a < b: -1, a == b: 0, a > b: 1
 */
export function compareVersions(a, b) {
    const aa = a.split(".").map((x) => Number(x));
    const bb = b.split(".").map((x) => Number(x));

    while (aa.length < 3) {
        aa.push(0);
    }
    while (bb.length < 3) {
        bb.push(0);
    }

    for (let i = 0; i < 3; i++) {
        if (aa[i] < bb[i]) {
            return -1;
        } else if (aa[i] > bb[i]) {
            return 1;
        }
    }
}

/**
 * Сделать первую букву заглавной
 * @param {string} string
 * @returns string
 */
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Конвертация типа операции к текстовому виду
 * @param {import("./types.js").OperationType} type
 */
export function printOperationType(type) {
    return capitalize(
        type
            .substring("OPERATION_TYPE_".length)
            .replace(/_/g, " ")
            .toLowerCase()
    );
}

/**
 * Конвертация типа операции к текстовому виду
 * @param {import("./types.js").OperationType} type
 */
export function printOperationTypeDescription(type) {
    switch (type) {
        case "OPERATION_TYPE_UNSPECIFIED":
            return "Тип операции не определён";
        case "OPERATION_TYPE_INPUT":
            return "Завод денежных средств";
        case "OPERATION_TYPE_BOND_TAX":
            return "Удержание налога по купонам";
        case "OPERATION_TYPE_OUTPUT_SECURITIES":
            return "Вывод ЦБ";
        case "OPERATION_TYPE_OVERNIGHT":
            return "Доход по сделке РЕПО овернайт";
        case "OPERATION_TYPE_TAX":
            return "Удержание налога";
        case "OPERATION_TYPE_BOND_REPAYMENT_FULL":
            return "Полное погашение облигаций";
        case "OPERATION_TYPE_SELL_CARD":
            return "Продажа ЦБ с карты";
        case "OPERATION_TYPE_DIVIDEND_TAX":
            return "Удержание налога по дивидендам";
        case "OPERATION_TYPE_OUTPUT":
            return "Вывод денежных средств";
        case "OPERATION_TYPE_BOND_REPAYMENT":
            return "Частичное погашение облигаций";
        case "OPERATION_TYPE_TAX_CORRECTION":
            return "Корректировка налога";
        case "OPERATION_TYPE_SERVICE_FEE":
            return "Удержание комиссии за обслуживание брокерского счёта";
        case "OPERATION_TYPE_BENEFIT_TAX":
            return "Удержание налога за материальную выгоду";
        case "OPERATION_TYPE_MARGIN_FEE":
            return "Удержание комиссии за непокрытую позицию";
        case "OPERATION_TYPE_BUY":
            return "Покупка ЦБ";
        case "OPERATION_TYPE_BUY_CARD":
            return "Покупка ЦБ с карты";
        case "OPERATION_TYPE_INPUT_SECURITIES":
            return "Завод ЦБ";
        case "OPERATION_TYPE_SELL_MARGIN":
            return "Продажа в результате Margin-call";
        case "OPERATION_TYPE_BROKER_FEE":
            return "Удержание комиссии за операцию";
        case "OPERATION_TYPE_BUY_MARGIN":
            return "Покупка в результате Margin-call";
        case "OPERATION_TYPE_DIVIDEND":
            return "Выплата дивидендов";
        case "OPERATION_TYPE_SELL":
            return "Продажа ЦБ";
        case "OPERATION_TYPE_COUPON":
            return "Выплата купонов";
        case "OPERATION_TYPE_SUCCESS_FEE":
            return "Удержание комиссии SuccessFee";
        case "OPERATION_TYPE_DIVIDEND_TRANSFER":
            return "Передача дивидендного дохода";
        case "OPERATION_TYPE_ACCRUING_VARMARGIN":
            return "Зачисление вариационной маржи";
        case "OPERATION_TYPE_WRITING_OFF_VARMARGIN":
            return "Списание вариационной маржи";
        case "OPERATION_TYPE_DELIVERY_BUY":
            return "Покупка в рамках экспирации фьючерсного контракта";
        case "OPERATION_TYPE_DELIVERY_SELL":
            return "Продажа в рамках экспирации фьючерсного контракта";
        case "OPERATION_TYPE_TRACK_MFEE":
            return "Комиссия за управление по счёту автоследования";
        case "OPERATION_TYPE_TRACK_PFEE":
            return "Комиссия за результат по счёту автоследования";
        case "OPERATION_TYPE_TAX_PROGRESSIVE":
            return "Удержание налога по ставке 15%";
        case "OPERATION_TYPE_BOND_TAX_PROGRESSIVE":
            return "Удержание налога по купонам по ставке 15%";
        case "OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE":
            return "Удержание налога по дивидендам по ставке 15%";
        case "OPERATION_TYPE_BENEFIT_TAX_PROGRESSIVE":
            return "Удержание налога за материальную выгоду по ставке 15%";
        case "OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE":
            return "Корректировка налога по ставке 15%";
        case "OPERATION_TYPE_TAX_REPO_PROGRESSIVE":
            return "Удержание налога за возмещение по сделкам РЕПО по ставке 15%";
        case "OPERATION_TYPE_TAX_REPO":
            return "Удержание налога за возмещение по сделкам РЕПО";
        case "OPERATION_TYPE_TAX_REPO_HOLD":
            return "Удержание налога по сделкам РЕПО";
        case "OPERATION_TYPE_TAX_REPO_REFUND":
            return "Возврат налога по сделкам РЕПО";
        case "OPERATION_TYPE_TAX_REPO_HOLD_PROGRESSIVE":
            return "Удержание налога по сделкам РЕПО по ставке 15%";
        case "OPERATION_TYPE_TAX_REPO_REFUND_PROGRESSIVE":
            return "Возврат налога по сделкам РЕПО по ставке 15%";
        case "OPERATION_TYPE_DIV_EXT":
            return "Выплата дивидендов на карту";
        case "OPERATION_TYPE_TAX_CORRECTION_COUPON":
            return "Корректировка налога по купонам";
    }
}
