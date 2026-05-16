import {
  CAROUSEL_ARROW_INNER,
  HAMBURGER_INNER,
  MENU_CARD_ICON_BY_ID,
  MENU_CARD_SVG_VIEWBOX,
  PRIMARY_BUTTON_ICON_INNER_HTML,
  THEME_TOGGLE_INNER_HTML,
} from "./shared/svg-icons.js";
import {
  DIALOG_TEMPLATE_HTML,
  MENU_CARD_TEMPLATE_HTML,
  SVG_NAMESPACE,
} from "./trusted-types.js";

/**
 * Full `<svg>...</svg>` string as built by `menu-card.js` and `control-host.js`.
 * @param {string} innerMarkup
 */
function wrapControlOrMenuSvg(innerMarkup) {
  return `<svg xmlns="${SVG_NAMESPACE}" viewBox="${MENU_CARD_SVG_VIEWBOX}">${innerMarkup}</svg>`;
}

/** @type {Set<string>} */
const allowedSvgHtml = new Set();

for (const def of Object.values(MENU_CARD_ICON_BY_ID)) {
  allowedSvgHtml.add(wrapControlOrMenuSvg(def.innerMarkup));
}
for (const inner of Object.values(PRIMARY_BUTTON_ICON_INNER_HTML)) {
  allowedSvgHtml.add(wrapControlOrMenuSvg(inner));
}
allowedSvgHtml.add(wrapControlOrMenuSvg(HAMBURGER_INNER));
for (const inner of Object.values(CAROUSEL_ARROW_INNER)) {
  allowedSvgHtml.add(wrapControlOrMenuSvg(inner));
}

/** @type {TrustedTypePolicy} */
let htmlPolicy;

// Capitalization here must match what the browser expects, hence createHTML and
// createScriptURL. Elsewhere, I've favored e.g. allowedSvgHtml to better
// distinguish between the elements.
if (window.trustedTypes?.createPolicy) {
  htmlPolicy = trustedTypes.createPolicy("policy", {
    createHTML,
    createScriptURL,
  });
} else {
  // Browsers without Trusted Types: no-op shim.
  htmlPolicy = {
    createHTML: (s) => s,
    createScriptURL: (s) => s,
  };
}

/**
 *
 * @param {string} html
 * @returns {string}
 */
export function trustedHtml(html) {
  return htmlPolicy.createHTML(html);
}

/**
 *
 * @param {string} url
 * @returns {string}
 */
export function trustedScriptURL(url) {
  return htmlPolicy.createScriptURL(url);
}

/**
 *
 * @param {string} input
 * @returns {string}
 */
function createHTML(input) {
  if (trustedHtmlArray.includes(input) || allowedSvgHtml.has(input))
    return input;
  throw new TypeError(`Can't create HTML; ${input} is not a trusted type.`);
}

/**
 *
 * @param {string} input
 * @returns {string}
 */
function createScriptURL(input) {
  if (trustedScriptUrlsArray.includes(input)) return input;
  throw new TypeError(
    `Can't create script URL; ${input} is not a trusted type.`,
  );
}

const trustedScriptUrlsArray = [
  "https://challenges.cloudflare.com/turnstile/v0/api.js",
];

const trustedHtmlArray = [
  DIALOG_TEMPLATE_HTML,
  MENU_CARD_TEMPLATE_HTML,
  THEME_TOGGLE_INNER_HTML,
];
