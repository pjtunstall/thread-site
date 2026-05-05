import { MazeBackground } from "./maze-background.js";
import { initDialogs } from "./dialogs.js";
import { defineMenuCard } from "./menu-card.js";
import { initMenu } from "./menu.js";
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
  initDialogs();
})();
