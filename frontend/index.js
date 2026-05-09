import { MazeBackground } from "./js/maze/maze.js";
import { initDialogs } from "./js/ui/dialogs.js";
import { defineMenuCard } from "./js/ui/menu-card.js";
import { initMenu } from "./js/ui/menu.js";
import { initTheme } from "./js/ui/theme.js";
import { initCarousel } from "./js/ui/carousel.js";

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
