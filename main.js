(function () {
  const LOG_PREFIX = "[site-init]";
  defineMenuCard();

  function requireElement(candidate, selector, expectedType) {
    if (candidate instanceof expectedType) return candidate;
    console.error(
      `${LOG_PREFIX} Required element ${selector} is missing or has the wrong type.`,
      candidate,
    );
    throw new Error(`${LOG_PREFIX} Missing required element: ${selector}`);
  }

  const themeToggle = requireElement(
    document.querySelector("[data-theme-toggle]"),
    "[data-theme-toggle]",
    HTMLButtonElement,
  );
  const menuToggle = requireElement(
    document.querySelector("[data-menu-toggle]"),
    "[data-menu-toggle]",
    HTMLButtonElement,
  );
  const menu = requireElement(
    document.querySelector("[data-menu]"),
    "[data-menu]",
    HTMLElement,
  );
  const root = document.documentElement;
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

  function readThemePreference() {
    try {
      const stored = localStorage.getItem("theme-preference");
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Could not access localStorage for theme preference; using system/default theme.`,
        error,
      );
      return "light";
    }
  }

  function applyThemePreference(theme) {
    root.setAttribute("data-theme", theme);
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
    themeToggle.setAttribute(
      "aria-pressed",
      theme === "dark" ? "true" : "false",
    );
  }

  function saveThemePreference(theme) {
    try {
      localStorage.setItem("theme-preference", theme);
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Could not persist theme preference to localStorage.`,
        error,
      );
    }
  }

  let currentTheme = readThemePreference();
  applyThemePreference(currentTheme);

  themeToggle.addEventListener("click", function () {
    const next = currentTheme === "dark" ? "light" : "dark";
    currentTheme = next;
    saveThemePreference(currentTheme);
    applyThemePreference(currentTheme);
  });

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

  const triggers = document.querySelectorAll("[data-open-dialog]");
  const dialogs = document.querySelectorAll("dialog[data-dialog]");
  if (triggers.length === 0) {
    console.error(
      `${LOG_PREFIX} No [data-open-dialog] triggers found; dialogs cannot be opened.`,
    );
  }
  if (dialogs.length === 0) {
    console.error(
      `${LOG_PREFIX} No dialog[data-dialog] elements found.`,
    );
  }

  triggers.forEach(function (btn) {
    const id = btn.getAttribute("data-open-dialog");
    const dialog = id ? document.getElementById(id) : null;
    if (!dialog || !(dialog instanceof HTMLDialogElement)) {
      console.error(
        `${LOG_PREFIX} Trigger references a missing or non-dialog target.`,
        { trigger: btn, targetId: id, target: dialog },
      );
      return;
    }

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

function defineMenuCard() {
  const LOG_PREFIX = "[menu-card]";
  const menuCardTemplateCandidate = document.querySelector(
    "#menu-card-template",
  );
  const menuCardTemplate =
    menuCardTemplateCandidate instanceof HTMLTemplateElement
      ? menuCardTemplateCandidate
      : null;

  if (customElements.get("menu-card")) {
    return; // Menu card is already defined.
  }

  if (!(menuCardTemplate instanceof HTMLTemplateElement)) {
    console.error(
      `${LOG_PREFIX} Missing or invalid #menu-card-template; expected an HTMLTemplateElement.`,
      menuCardTemplateCandidate,
    );
  }

  class MenuCard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return; // Already hydrated.

      const label = this.getAttribute("label") || "";
      const icon = this.querySelector("svg");

      this.classList.add("menu-card");
      this.replaceChildren();

      if (!(menuCardTemplate instanceof HTMLTemplateElement)) {
        console.error(
          `${LOG_PREFIX} Cannot hydrate card: #menu-card-template is unavailable.`,
          this,
        );
        return;
      }

      const fragment = menuCardTemplate.content.cloneNode(true);
      const frontFaceCandidate = fragment.querySelector(".menu-card__face--front");
      const frontFace =
        frontFaceCandidate instanceof HTMLElement ? frontFaceCandidate : null;
      const labelNodeCandidate = fragment.querySelector("[data-menu-card-label]");
      const labelNode =
        labelNodeCandidate instanceof HTMLElement ? labelNodeCandidate : null;

      if (!(frontFace instanceof HTMLElement)) {
        console.error(
          `${LOG_PREFIX} Template is missing .menu-card__face--front.`,
          frontFaceCandidate,
        );
        return;
      }

      if (!(labelNode instanceof HTMLElement)) {
        console.error(
          `${LOG_PREFIX} Template is missing [data-menu-card-label].`,
          labelNodeCandidate,
        );
        return;
      }

      if (!(icon instanceof SVGElement)) {
        console.error(
          `${LOG_PREFIX} Card is missing child <svg> icon.`,
          this,
        );
      } else {
        const iconClone = icon.cloneNode(true);
        if (iconClone instanceof SVGElement) {
          iconClone.setAttribute("aria-hidden", "true");
        }
        frontFace.prepend(iconClone);
      }

      labelNode.textContent = label;
      this.append(fragment);
      this.dataset.hydrated = "true";
    }
  }

  try {
    customElements.define("menu-card", MenuCard);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
