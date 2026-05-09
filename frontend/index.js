import { MazeBackground } from "./maze-background.js";
import { initDialogs } from "./dialogs.js";
import { defineMenuCard } from "./menu-card.js";
import { initMenu } from "./menu.js";
import { initTheme } from "./theme.js";
import { initCarousel } from "./carousel.js";

(function () {
  const mazeBackground = new MazeBackground();
  mazeBackground.start();
  const newMazeButton = document.querySelector("[data-new-maze]");
  if (newMazeButton instanceof HTMLButtonElement) {
    newMazeButton.addEventListener("click", function () {
      mazeBackground.restart();
    });
  }

  defineMenuCard();

  initTheme({
    onThemeChange: function () {
      mazeBackground.restart();
    },
  });
  initCarousel();
  initMenu();
  initDialogs();
})();
