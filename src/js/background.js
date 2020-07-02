// Этот скрипт выполняется в фоне браузера

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.type != "GetPositions") { return; }

        console.log("GetPositions");
        console.log(request);
        console.log(sender);

        if (localStorage["overrideAveragePriceOnWebTerminal"] !== "true") {
            console.log("Overriding of average price on Web Terminal page is disabled");
            return;
        }

        var positions = JSON.parse(localStorage.getItem('positions')) || [];

        sendResponse(positions);
    });
