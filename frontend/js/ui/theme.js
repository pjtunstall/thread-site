import { getThemeToggle } from "./dom-utils.js";

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

/**
 *
 * @param {string} theme
 * @param {HTMLButtonElement} themeToggle
 * @returns
 */
function applyThemePreference(theme, themeToggle) {
  root.setAttribute("data-theme", theme);
  if (!(themeToggle instanceof HTMLButtonElement)) return;
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

/**
 *
 * @param {string} theme
 */
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

/**
 * @param {{ themeToggle?: HTMLButtonElement | null }} [options]
 * @returns {string}
 */
export function applyStoredThemePreference(options = {}) {
  const { themeToggle } = options;
  const currentTheme = readThemePreference();
  applyThemePreference(currentTheme, themeToggle);
  return currentTheme;
}

/**
 * @param {{ onThemeChange?: (theme: string) => void }} [options]
 * @returns {string | undefined} Theme string when no toggle exists; otherwise undefined.
 */
export function initTheme(options = {}) {
  const { onThemeChange } = options;
  const themeToggle = getThemeToggle();
  if (!themeToggle) {
    return applyStoredThemePreference();
  }

  let currentTheme = applyStoredThemePreference({ themeToggle });

  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    saveThemePreference(currentTheme);
    applyThemePreference(currentTheme, themeToggle);
    if (typeof onThemeChange === "function") onThemeChange(currentTheme);
  });
}
