 /**
  * Конвертация строкового представления валюты в символ
  * @param {string} currency Валюта (RUB, USD, EUR)
  */
export function mapCurrency(currency) {
    if (!currency) { return ""; }
    switch (currency) {
        case "RUB": return "₽";
        case "USD": return "$";
        case "EUR": return "€";
        default: return currency;
    }
}

/**
 * Отображение денежного значения
 * @param {number} value Числовое значение
 * @param {string} currency Валюта
 * @param {boolean} withSign true, если нужно добавить знак + перед положительным значением
 */
export function printMoney(value, currency, withSign = false) {
    if (value == null || value == undefined || isNaN(value)) { return ""; }
    const sign = (withSign && value > 0 ? '+' : '')
    return `${sign}${value?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${mapCurrency(currency)}`;
}

/**
 * CSS-класс цвета денежного значения (красный, зеленый)
 * @param {number} value Числовое денежное значение
 */
export function getMoneyColorClass(value) {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return '';
}

/**
 * Конвертация типа инструмента в название группы
 * @param {string} type Тип инструмента
 */
export function mapInstrumentType(type) {
    switch (type) {
        case "Stock": return "Stocks";
        case "Bond": return "Bonds";
        case "Etf": return "ETF";
        case "Currency": return "Currencies";
        default: return type;
    }
}

/**
  * Включить/выключить CSS класс для элемента по условию
  * @param {object} element - HTML элемент
  * @param {string} className - Название класса
  * @param {boolean} condition - Условие, при выполнении которого класс будет применён
  */
export function setClassIf(element, className, condition) {
    if (!condition && element.classList.contains(className)) {
        element.classList.remove(className);
    }
    else if (condition && !element.classList.contains(className)) {
        element.classList.add(className);
    }
}

/**
 * Преобразовать строку к "безопасному" виду, содержащему только A-Z, a-z, 0-9, -, _
 * @param {string} text 
 */
export function convertToSlug(text) {
    return text
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '_');
}