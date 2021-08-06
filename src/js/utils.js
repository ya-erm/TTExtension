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
 * @param {number} precision Количество знаков после запятой
 */
export function printMoney(value, currency, withSign = false, precision = 2) {
    if (value == null || value == undefined || isNaN(value)) { return ""; }
    const sign = (withSign && value > 0 ? '+' : '');
    const parts = value.toFixed(precision).split(".");
    const fractionalPart = parts.length > 1 ? "." + parts[1] : "";
    return `${sign}${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${fractionalPart} ${mapCurrency(currency)}`;
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
 * Отображение значения с множителем К, М (например 9.75К, 75.5K, 1.54M)
 * @param {number} value Числовое значение
 */
export function printVolume(value) {
    if (value == null || value == undefined || isNaN(value)) { return ""; }
    if (Math.abs(value) <= 1000) { return `${value}`; }
    else if (Math.abs(value) < 10_000) { return `${(value / 1_000).toFixed(2)}K`; }
    else if (Math.abs(value) < 100_000) { return `${(value / 1_000).toFixed(1)}K`; }
    else if (Math.abs(value) < 1_000_000) { return `${(value / 1_000).toFixed(0)}K`; }
    else { return `${(value / 1_000_000).toFixed(2)}M`; }
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

/**
 * 
 * @param {Date | String} date 
 */
export function printDate(date) {
    if (!!date && date.__proto__ != Date.prototype) {
        date = new Date(date)
    }
    var options = { year: "2-digit", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };
    return date?.toLocaleDateString("ru-RU", options)
}

/**
 * Сравнение версий
 * @param {string} a - версия 1
 * @param {string} b - версия 2
 * @returns {number} a < b: -1, a == b: 0, a > b: 1
 */
export function compareVersions(a, b) {
    const aa = a.split(".").map(x => Number(x));
    const bb = b.split(".").map(x => Number(x));

    while (aa.length < 3) { aa.push(0); }
    while (bb.length < 3) { bb.push(0); }

    for(let i = 0; i < 3; i++ ){
        if (aa[i] < bb[i]) {
            return -1;
        } else if (aa[i] > bb [i]){
            return 1;
        }
    }
}
