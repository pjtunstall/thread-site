const LOG_PREFIX = "[site-init]";

function getDialogTargetForTrigger(trigger) {
  const id = trigger.getAttribute("data-open-dialog");
  const dialog = id ? document.getElementById(id) : null;
  if (!dialog || !(dialog instanceof HTMLDialogElement)) {
    console.error(`${LOG_PREFIX} Trigger references a missing or non-dialog target.`, {
      trigger,
      targetId: id,
      target: dialog,
    });
    return null;
  }
  return dialog;
}

export function initDialogs() {
  const dialogTriggers = document.querySelectorAll("[data-open-dialog]");
  const dialogs = document.querySelectorAll("dialog[data-dialog]");

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
