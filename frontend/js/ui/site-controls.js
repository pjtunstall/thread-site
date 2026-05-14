import { defineCarouselArrowButton } from "./carousel-arrow-button.js";
import { defineMenuButton } from "./menu-button.js";
import { defineMenuCard } from "./menu-card.js";
import { defineMenuToggleButton } from "./menu-toggle-button.js";
import { definePrimaryButton } from "./primary-button.js";
import { defineThemeToggleButton } from "./theme-toggle-button.js";

// Registers custom elements that wrap native controls. Order matters for
// dependencies, but, in this case, the only requirement is that menuCard must
// be defined before menuButton.
export function defineSiteControlElements() {
  defineMenuCard();
  defineMenuButton();
  definePrimaryButton();
  defineMenuToggleButton();
  defineThemeToggleButton();
  defineCarouselArrowButton();
}
