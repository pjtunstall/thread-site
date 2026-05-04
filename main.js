(function () {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const root = document.documentElement;

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
      themeToggle.setAttribute("title", themeToggle.getAttribute("aria-label"));
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
