const LOG_PREFIX = "[site-init]";

/**
 * Return `candidate` if it's of the expected type. Throw an error if not.
 *
 * @template {Element} T
 * @param {Element | null} candidate
 * @param {string} selector
 * @param {new (...args: any[]) => T} expectedType
 * @returns {T}
 */
function requireElement(candidate, selector, expectedType) {
  if (!(candidate instanceof expectedType)) {
    console.error(
      `${LOG_PREFIX} Required element ${selector} is missing or has the wrong type.`,
      candidate,
    );
    throw new Error(`${LOG_PREFIX} Missing required element: ${selector}`);
  }

  return candidate;
}

export const menuPanel = requireElement(
  document.querySelector("[data-menu-panel]"),
  "[data-menu-panel]",
  HTMLElement,
);

/**
 * Should be called after `defineSiteControlElements()` hydrates the menu-toggle
 * inner `<button>`.
 *
 * @returns {HTMLButtonElement}
 */
export function getMenuToggle() {
  const el = document.querySelector("[data-menu-toggle]");
  return requireElement(el, "[data-menu-toggle]", HTMLButtonElement);
}

/**
 * Should be called after `defineSiteControlElements()` hydrates the
 * theme-toggle inner `<button>`. Soft failure path rather than throw so as to
 * allow the caller to set the theme anyway and thus avoid troubling the user's
 * eyes to harsh light simply because I forgot to add the button. I didn't
 * forget to, but if I did.
 *
 * @returns {HTMLButtonElement | null}
 */
export function getThemeToggle() {
  const el = document.querySelector("[data-theme-toggle]");
  return el instanceof HTMLButtonElement ? el : null;
}
