/**
 * Отобразить модальное окно подтверждения
 * @param {string} title - заголовок
 * @param {string} text - текст
 * @param {() => void} okHandler - обработчик нажатия кнопки ОК
 * @param {() => void} cancelHandler - обработчик нажатия кнопки Cancel
 */
export function showConfirm(title, text, okHandler, cancelHandler = undefined) {
    const modal = document.getElementById("confirm-modal");
    const header = modal.querySelector(".modal-title");
    const body = modal.querySelector(".modal-body span");
    const okButton = modal.querySelector("#confirm-form-ok-button");
    const cancelButton = modal.querySelector("#confirm-form-cancel-button");

    header.textContent = title;
    body.textContent = text;

    const onOkClick = () => {
        okHandler();
        okButton.removeEventListener("click", onOkClick);
        cancelButton.removeEventListener("click", onCancelClick);
    };
    const onCancelClick = () => {
        if (cancelHandler) {
            cancelHandler();
        }
        okButton.removeEventListener("click", onOkClick);
        cancelButton.removeEventListener("click", onCancelClick);
    }
    okButton.addEventListener("click", onOkClick);
    cancelButton.addEventListener("click", onCancelClick);

    // @ts-ignore
    $('#confirm-modal').modal('show');
}
