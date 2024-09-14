// @ts-check
import { Portfolio } from "./portfolio.js";

export const storage = {
    token: localStorage.getItem("token"),

    /** @type {Object<string, number>} */
    currencyRates: JSON.parse(localStorage.getItem("currencyRates") ?? '{}'),

    /** @type {Portfolio[]} */
    portfolios: JSON.parse(localStorage.getItem("portfolios") ?? '[]'),

    /** @type {string?} */
    selectedPortfolio: localStorage.getItem("selectedPortfolio") || null,
};

storage.portfolios.forEach((portfolio) => {
    // @ts-ignore
    portfolio.__proto__ = Portfolio.prototype;
    portfolio.fillMissingFields();
});

/** Очистить все данные */
export function eraseData() {
    storage.token = null;
    storage.currencyRates = {};
    storage.portfolios = [];
    storage.selectedPortfolio = null;
}

/** Сохранить портфели */
export function savePortfolios() {
    localStorage.setItem("portfolios", JSON.stringify(storage.portfolios));
}

/** Сохранить курсы валют */
export function saveCurrencyRates() {
    localStorage.setItem("currencyRates", JSON.stringify(storage.currencyRates));
}
