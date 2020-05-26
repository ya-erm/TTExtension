/* Этот скрипт выполняется на разрешённых страницах */

// window.onblur = function() { // окно теряет фокус
//     chrome.runtime.sendMessage({ site: site, time: localStorage[site] }); // отправка сообщения на background.js
//     localStorage[site] = '0';
// }

// function sec() //выполняется каждую секунду
// {
//     // if (document.webkitVisibilityState == 'visible') //если страница активна
//     // {
//     //     localStorage[site] = parseInt(localStorage[site], 10) + 1; // обновляем данные о сайте в локальном хранилище
//     // }
//     console.log("Hello world");

// }

// setInterval(sec, 5000); // запускать функцию каждые 5 сек

