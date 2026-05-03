(function () {
  const triggers = document.querySelectorAll("[data-open-dialog]");
  const dialogs = document.querySelectorAll("dialog[data-dialog]");

  triggers.forEach(function (btn) {
    const id = btn.getAttribute("data-open-dialog");
    const dialog = id ? document.getElementById(id) : null;
    if (!dialog || !(dialog instanceof HTMLDialogElement)) return;

    btn.addEventListener("click", function () {
      dialog.showModal();
    });
  });

  dialogs.forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-dialog-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        dialog.close();
      });
    });
  });
})();
