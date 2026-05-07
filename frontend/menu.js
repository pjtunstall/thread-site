import { menu, menuToggle } from "./dom-utils.js";

export function initMenu() {
  let isMenuOpen = false;

  function setMenuOpen(nextState) {
    isMenuOpen = nextState;
    if (isMenuOpen) {
      menu.hidden = false;
      menu.setAttribute("data-menu-open", "false");
      window.requestAnimationFrame(function () {
        if (isMenuOpen) {
          menu.setAttribute("data-menu-open", "true");
        }
      });
    } else {
      menu.setAttribute("data-menu-open", "false");
      menu.hidden = true;
    }
    menuToggle.setAttribute("aria-expanded", String(isMenuOpen));
    menuToggle.setAttribute(
      "aria-label",
      isMenuOpen ? "Close site menu" : "Open site menu",
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function shouldCloseMenuOnClick(item) {
    const closePreference = item.getAttribute("data-menu-close");
    if (closePreference === null) return true;
    return closePreference !== "false";
  }

  menuToggle.addEventListener("click", function (event) {
    event.stopPropagation();
    setMenuOpen(!isMenuOpen);
  });

  document.addEventListener("click", function (event) {
    if (!isMenuOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target) || menuToggle.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isMenuOpen) {
      closeMenu();
    }
  });

  menu.querySelectorAll("button, a").forEach(function (item) {
    item.addEventListener("click", function () {
      if (shouldCloseMenuOnClick(item)) closeMenu();
    });
  });
}
