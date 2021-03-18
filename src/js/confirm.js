import { setClassIf } from "./utils.js";

/**
 * Отобразить модальное окно подтверждения
 * @param {string} title - заголовок
 * @param {string} text - текст
 * @param {() => Promise<void>} okHandler - обработчик нажатия кнопки ОК
 * @param {() => void} cancelHandler - обработчик нажатия кнопки Cancel
 */
export function showConfirm(title, text, okHandler, cancelHandler = undefined) {
    const modal = document.getElementById("confirm-modal");
    const header = modal.querySelector(".modal-title");
    const body = modal.querySelector(".modal-body div.text");
    const errorMessage = modal.querySelector("div.error-message");
    const okButton = modal.querySelector("#confirm-ok-button");
    const cancelButton = modal.querySelector("#confirm-cancel-button");
    
    header.textContent = title;
    body.textContent = text;
    errorMessage.textContent = "";
    setClassIf(okButton, 'd-none', false);

    const onOkClick = () => {
        okHandler()
            .then(() => {
                okButton.removeEventListener("click", onOkClick);
                cancelButton.removeEventListener("click", onCancelClick);
                // @ts-ignore
                $('#confirm-modal').modal('hide');
            })
            .catch((e) => {
                errorMessage.textContent = e.message;
                setClassIf(okButton, 'd-none', true);
            })
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
