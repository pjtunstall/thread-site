(function () {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const root = document.documentElement;
  let isMenuOpen = false;

  function setMenuOpen(nextState) {
    if (
      !(menu instanceof HTMLElement) ||
      !(menuToggle instanceof HTMLButtonElement)
    ) {
      return;
    }

    isMenuOpen = nextState;
    menu.hidden = !isMenuOpen;
    menuToggle.setAttribute("aria-expanded", String(isMenuOpen));
    menuToggle.setAttribute(
      "aria-label",
      isMenuOpen ? "Close site menu" : "Open site menu",
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function readThemePreference() {
    try {
      const stored = localStorage.getItem("theme-preference");
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch (_) {
      return "light";
    }
  }

  function applyThemePreference(theme) {
    root.setAttribute("data-theme", theme);

    if (themeToggle instanceof HTMLButtonElement) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      );
      themeToggle.setAttribute(
        "aria-pressed",
        theme === "dark" ? "true" : "false",
      );
    }
  }

  function saveThemePreference(theme) {
    try {
      localStorage.setItem("theme-preference", theme);
    } catch (_) {}
  }

  let currentTheme = readThemePreference();
  applyThemePreference(currentTheme);

  if (themeToggle instanceof HTMLButtonElement) {
    themeToggle.addEventListener("click", function () {
      const next = currentTheme === "dark" ? "light" : "dark";
      currentTheme = next;
      saveThemePreference(currentTheme);
      applyThemePreference(currentTheme);
    });
  }

  if (menuToggle instanceof HTMLButtonElement && menu instanceof HTMLElement) {
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
        closeMenu();
      });
    });
  }

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
