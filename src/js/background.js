// Этот скрипт выполняется в фоне браузера

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.type != "GetPositions") { return; }

        console.log("Message received", request.type);
        console.log("request", request);
        console.log("sender", sender);

        if (localStorage["overrideAveragePriceOnWebTerminal"] !== "true") {
            console.log("Overriding of average price on Web Terminal page is disabled");
            sendResponse();
        } else {
            // TODO добавить поддержку ИИС
            var positions = JSON.parse(localStorage.getItem('positions')) || [];
            sendResponse(positions);
        }
    });
