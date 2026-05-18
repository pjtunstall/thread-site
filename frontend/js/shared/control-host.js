/**
 * Helpers for wrapper custom elements (`<menu-button>`, `<primary-button>`,
 * `<theme-toggle-button>`, ...).
 *
 * Terminology
 *
 * - Host: The custom element as it appears in the document (for example
 *   `<menu-button label="STORY" ...>`). It's the direct parent of the subtree the
 *   component injects: a single native interactive child. Most attributes declared
 *   on the host are mirrored onto that child on connect so
 *   `querySelector("[data-open-dialog]")` and similar calls resolve to a real
 *   `<button>` or `<a>` rather than depending on the custom tag name.
 * - Control: The inner native element: `<button type="button">` or, when the host
 *   has an `href`, an `<a>`. The term *control* is used because "button" would be
 *   inaccurate for anchors.
 *
 * Mirroring skips attribute names consumed by the wrapper (for example `label` /
 * `icon`) and skips the host `class`, since the control’s `className` is set in
 * code (`btn btn--ghost`, etc.).
 */

import { trustedHtml } from "../trusted-types-boot.js";
import { SVG_NAMESPACE } from "../trusted-types.js";

/**
 * This function creates the inner interactive element for this host: `<a>` if
 * `href` is set on the host, otherwise `<button type="button">`.
 *
 * @param {HTMLElement} host - Wrapper custom element (`<menu-button>`, etc.)
 * @returns {HTMLButtonElement | HTMLAnchorElement}
 */
export function createInnerButtonOrAnchor(host) {
  const href = host.getAttribute("href");
  if (href) {
    return document.createElement("a");
  }
  const button = document.createElement("button");
  button.type = "button";
  return button;
}

/**
 * This function copies attributes from the host (wrapper in the document) onto
 * the control (the real `<button>` or `<a>` inside it).
 *
 * It skips:
 *   - names in `options.skip` (consumed by the component, e.g. `label`/`icon`);
 *   - the host’s `class` attribute, because the control's `className` is set in
 *     code (`btn btn--ghost`, etc.).
 *
 * @param {HTMLElement} host - Wrapper custom element
 * @param {HTMLElement} control - Inner `<button>` or `<a>`
 * @param {{ skip: Set<string> }} options
 */
export function mirrorHostAttributesExcept(host, control, options) {
  const { skip } = options;
  for (let i = 0; i < host.attributes.length; i++) {
    const attr = host.attributes[i];
    if (skip.has(attr.name)) continue;
    if (attr.name === "class") continue;
    control.setAttribute(attr.name, attr.value);
  }
}

/**
 * @param {string} innerMarkup
 * @param {string} [viewBox]
 * @returns {SVGElement | null}
 */
export function svgElementFromInnerMarkup(innerMarkup, viewBox = "0 0 24 24") {
  const tpl = document.createElement("template");
  tpl.innerHTML = trustedHtml(
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="${viewBox}">${innerMarkup}</svg>`,
  );
  const el = tpl.content.firstElementChild;
  return el instanceof SVGElement ? el : null;
}

/**
 * Attach the finished control as the host’s only child and mark hydration done.
 *
 * @param {HTMLElement} host - Wrapper custom element
 * @param {HTMLElement} control - Inner `<button>` or `<a>`
 */
export function finalizeControlHost(host, control) {
  host.replaceChildren(control);
  host.dataset.hydrated = "true";
}
