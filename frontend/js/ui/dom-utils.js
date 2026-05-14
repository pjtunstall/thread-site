const LOG_PREFIX = "[site-init]";

export function requireElement(candidate, selector, expectedType) {
  if (candidate instanceof expectedType) return candidate;
  console.error(
    `${LOG_PREFIX} Required element ${selector} is missing or has the wrong type.`,
    candidate,
  );
  throw new Error(`${LOG_PREFIX} Missing required element: ${selector}`);
}

export const menuPanel = requireElement(
  document.querySelector("[data-menu-panel]"),
  "[data-menu-panel]",
  HTMLElement,
);

/**
 * Resolved when called (after `defineSiteControlElements()` hydrates the menu
 * toggle inner `<button>`).
 *
 * @returns {HTMLButtonElement}
 */
export function getMenuToggle() {
  const el = document.querySelector("[data-menu-toggle]");
  return requireElement(
    el,
    "[data-menu-toggle]",
    HTMLButtonElement,
  );
}

/**
 * Inner `<button>` from `<theme-toggle-button>` (after `defineSiteControlElements()`).
 *
 * @returns {HTMLButtonElement | null}
 */
export function getThemeToggle() {
  const el = document.querySelector("[data-theme-toggle]");
  return el instanceof HTMLButtonElement ? el : null;
}
