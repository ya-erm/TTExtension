// Пример обмена сообщениями с расширением
/*
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type != "SpecificCommand") { return; }

    console.log("Message received", request.type);
    console.log("request", request);
    console.log("sender", sender);

    sendResponse();
});
*/
