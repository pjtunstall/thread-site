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

/** @type {{ html: Set<string>, scriptUrls: string[] }} */
const registry = globalThis.__threadTrusted ?? {
  html: new Set(),
  scriptUrls: [],
};
globalThis.__threadTrusted = registry;

for (const def of Object.values(MENU_CARD_ICON_BY_ID)) {
  registry.html.add(wrapControlOrMenuSvg(def.innerMarkup));
}
for (const inner of Object.values(PRIMARY_BUTTON_ICON_INNER_HTML)) {
  registry.html.add(wrapControlOrMenuSvg(inner));
}
registry.html.add(wrapControlOrMenuSvg(HAMBURGER_INNER));
for (const inner of Object.values(CAROUSEL_ARROW_INNER)) {
  registry.html.add(wrapControlOrMenuSvg(inner));
}

registry.html.add(DIALOG_TEMPLATE_HTML);
registry.html.add(MENU_CARD_TEMPLATE_HTML);
registry.html.add(THEME_TOGGLE_INNER_HTML);
registry.scriptUrls.push(TURNSTILE_API_URL);

/** @type {TrustedTypePolicy} */
let htmlPolicy;

if (globalThis.trustedTypes?.getPolicy) {
  htmlPolicy = globalThis.trustedTypes.getPolicy("policy");
  if (!htmlPolicy && globalThis.trustedTypes.createPolicy) {
    htmlPolicy = globalThis.trustedTypes.createPolicy("policy", {
      createHTML(input) {
        if (registry.html.has(input)) return input;
        throw new TypeError("Can't create HTML; input is not a trusted type.");
      },
      createScriptURL(input) {
        if (registry.scriptUrls.includes(input)) return input;
        throw new TypeError(
          "Can't create script URL; input is not a trusted type.",
        );
      },
    });
  }
} else {
  htmlPolicy = {
    createHTML: (s) => s,
    createScriptURL: (s) => s,
  };
}

if (!htmlPolicy) {
  throw new Error(
    "[trusted-types-boot] Trusted Types policy 'policy' is missing.",
  );
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
