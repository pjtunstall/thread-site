import { getMenuToggle, menuPanel } from "./dom-utils.js";

export function initMenu() {
  const menuToggle = getMenuToggle();
  let isMenuOpen = false;

  /**
   *
   * @param {boolean} nextState
   */
  const setMenuOpen = (nextState) => {
    isMenuOpen = nextState;
    if (isMenuOpen) {
      menuPanel.hidden = false;
      menuPanel.setAttribute("data-menu-open", "false");
      window.requestAnimationFrame(() => {
        if (isMenuOpen) {
          menuPanel.setAttribute("data-menu-open", "true");
        }
      });
    } else {
      menuPanel.setAttribute("data-menu-open", "false");
      menuPanel.hidden = true;
    }
    menuToggle.setAttribute("aria-expanded", String(isMenuOpen));
    menuToggle.setAttribute(
      "aria-label",
      isMenuOpen ? "Close site menu" : "Open site menu",
    );
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const shouldCloseMenuOnClick = (item) => {
    const closePreference = item.getAttribute("data-menu-close");
    if (closePreference === null) return true;
    return closePreference !== "false";
  };

  menuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(!isMenuOpen);
  });

  document.addEventListener("click", (event) => {
    if (!isMenuOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menuPanel.contains(target) || menuToggle.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen) {
      closeMenu();
    }
  });

  menuPanel.querySelectorAll("button, a").forEach((item) => {
    item.addEventListener("click", () => {
      if (shouldCloseMenuOnClick(item)) closeMenu();
    });
  });
}
