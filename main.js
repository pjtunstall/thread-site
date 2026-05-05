import { MazeBackground } from "./maze-background.js";
import { defineMenuCard } from "./menu-card.js";
import { initMenu } from "./menu.js";
import {
  dialogTriggers,
  dialogs,
  getDialogTargetForTrigger,
} from "./dom-utils.js";
import { initTheme } from "./theme.js";

(function () {
  defineMenuCard();
  const mazeBackground = new MazeBackground();
  mazeBackground.start();

  initTheme({
    onThemeChange: function () {
      mazeBackground.restart();
    },
  });
  initMenu();

  dialogTriggers.forEach(function (btn) {
    const dialog = getDialogTargetForTrigger(btn);
    if (!dialog) return;

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
