import {
  dialogTriggers,
  dialogs,
  getDialogTargetForTrigger,
} from "./dom-utils.js";

export function initDialogs() {
  dialogTriggers.forEach(function (btn) {
    const dialog = getDialogTargetForTrigger(btn);
    if (!dialog) return;

    btn.addEventListener("click", function () {
      dialog.showModal();
    });
  });

  dialogs.forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-dialog-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        dialog.close();
      });
    });
  });
}
