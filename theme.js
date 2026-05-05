import { themeToggle } from "./dom-utils.js";

const LOG_PREFIX = "[site-init]";
const root = document.documentElement;

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
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
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

export function initTheme(options = {}) {
  const { onThemeChange } = options;

  let currentTheme = readThemePreference();
  applyThemePreference(currentTheme);

  themeToggle.addEventListener("click", function () {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    saveThemePreference(currentTheme);
    applyThemePreference(currentTheme);
    if (typeof onThemeChange === "function") onThemeChange(currentTheme);
  });
}
