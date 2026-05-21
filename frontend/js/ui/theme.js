import { getThemeToggle } from "./dom-utils.js";

const LOG_PREFIX = "[site-init]";
const root = document.documentElement;
const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

/**
 * @returns {boolean}
 */
function hasExplicitThemePreference() {
  try {
    const stored = localStorage.getItem("theme-preference");
    return stored === "light" || stored === "dark";
  } catch {
    return false;
  }
}

/**
 * @returns {"light" | "dark"}
 */
function themeFromSystemPreference() {
  return darkSchemeQuery.matches ? "dark" : "light";
}

/**
 * @returns {"light" | "dark"}
 */
function readThemePreference() {
  if (hasExplicitThemePreference()) {
    try {
      const stored = localStorage.getItem("theme-preference");
      if (stored === "light" || stored === "dark") return stored;
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Could not read theme preference from localStorage; using system theme.`,
        error,
      );
    }
  }
  return themeFromSystemPreference();
}

/**
 * @param {string} theme
 * @param {HTMLButtonElement} themeToggle
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

  darkSchemeQuery.addEventListener("change", () => {
    if (hasExplicitThemePreference()) return;
    currentTheme = themeFromSystemPreference();
    applyThemePreference(currentTheme, themeToggle);
    if (typeof onThemeChange === "function") onThemeChange(currentTheme);
  });

  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    saveThemePreference(currentTheme);
    applyThemePreference(currentTheme, themeToggle);
    if (typeof onThemeChange === "function") onThemeChange(currentTheme);
  });
}
