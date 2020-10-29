/**
  * Найти вкладку
  * @param {string} href - Идентификатор вкладки
  */
export function findTab(href) {
    return document.querySelector(`#main-nav #${href}-tab`);
}

/**
  * Создать новую вкладку по шаблону
  * @param {string} tabTemplateId - Идентификатор шаблона вкладки
  * @param {string} tabPaneTemplateId - Идентификатор шаблона содержимого
  * @param {string} title - Заголовок вкладки
  * @param {string} href - Идентификатор вкладки
  */
export function createTab(tabTemplateId, tabPaneTemplateId, title, href) {
    if (!href) { href = title.toLocaleLowerCase(); }

    // Добавляем вкладку
    const tab = document.getElementById(tabTemplateId).content.firstElementChild.cloneNode(true);
    const link = tab.querySelector("a");
    link.textContent = title;
    link.id = `${href}-tab`;
    link.href = `#${href}`;
    link.setAttribute("aria-controls", `${href}`);

    // Добавляем содержимое вкладки
    const tabPane = document.getElementById(tabPaneTemplateId).content.firstElementChild.cloneNode(true);
    tabPane.id = `${href}`;
    tabPane.setAttribute("aria-labelledby", `${href}-tab`);

    // Добавляем вкладку в DOM
    const mainNav = document.querySelector("#main-nav");
    const mainTabContent = document.querySelector("#main-tab-content");
    mainNav.appendChild(tab);
    mainTabContent.appendChild(tabPane);

    return { tab, tabPane };
}

/**
  * Открыть вкладку
  * @param {string} href - Идентификатор вкладки
  */
export function openTab(href) {
    $(`#${href}-tab`).tab("show");
}

/**
  * Закрыть вкладку
  * @param {string} href - Идентификатор вкладки
  */
export function closeTab(href) {
    const tab = document.querySelector(`.nav-item a[href="#${href}"]`).closest(".nav-item");
    const tabPane = document.getElementById(href);
    const navTabs = tab.closest(".nav-tabs");
    tabPane.remove();
    tab.remove();
    // Если была закрыта активная вкладка
    if (!navTabs.querySelector(".nav-link[aria-selected='true'")) {
        // Открываем вкладку по-умолчанию
        const defaultTabId = navTabs.querySelector(".nav-link[data-default='true']").id
        $(`#${defaultTabId}`).tab('show')
    }
}

export default {
    createTab,
    closeTab,
    openTab,
}
