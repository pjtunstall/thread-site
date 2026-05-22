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
  TURNSTILE_API_URL,
} from "./trusted-types.js";

/**
 * Full `<svg>...</svg>` string as built by `menu-card.js` and `control-host.js`.
 *
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

const trustedScriptUrlsArray = [TURNSTILE_API_URL];

const trustedHtmlArray = [
  DIALOG_TEMPLATE_HTML,
  MENU_CARD_TEMPLATE_HTML,
  THEME_TOGGLE_INNER_HTML,
];

/**
 * @param {string} input
 * @returns {string}
 */
function createHTML(input) {
  if (trustedHtmlArray.includes(input) || allowedSvgHtml.has(input))
    return input;
  throw new TypeError(`Can't create HTML; ${input} is not a trusted type.`);
}

/**
 * @param {string} input
 * @returns {string}
 */
function createScriptURL(input) {
  if (trustedScriptUrlsArray.includes(input)) return input;
  throw new TypeError(
    `Can't create script URL; ${input} is not a trusted type.`,
  );
}

/** @type {TrustedTypePolicy} */
let htmlPolicy;

if (window.trustedTypes?.createPolicy) {
  htmlPolicy = window.trustedTypes.createPolicy("policy", {
    createHTML,
    createScriptURL,
  });
} else {
  htmlPolicy = {
    createHTML: (s) => s,
    createScriptURL: (s) => s,
  };
}

/**
 * @param {string} html
 * @returns {TrustedHTML | string}
 */
export function trustedHtml(html) {
  return htmlPolicy.createHTML(html);
}

/**
 * @param {string} url
 * @returns {TrustedScriptURL | string}
 */
export function trustedScriptURL(url) {
  return htmlPolicy.createScriptURL(url);
}
