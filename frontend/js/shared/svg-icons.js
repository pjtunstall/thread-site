/** ViewBox shared by all menu-card icons (Lucide-style 24×24 grid). */
export const MENU_CARD_SVG_VIEWBOX = "0 0 24 24";

/**
 * Inner SVG markup only (no `<svg>` wrapper). The `menu-card` element applies
 * `xmlns`, `viewBox`, and optional root `class`.
 *
 * @typedef {{ innerMarkup: string, svgClass?: string }} MenuCardIconDef
 */

/**
 * Icons for `<menu-card>` / `<menu-button>`, keyed by `data-menu-icon` value.
 *
 * @type {Record<string, MenuCardIconDef>}
 */
export const MENU_CARD_ICON_BY_ID = {
  story: {
    innerMarkup:
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h8"/><path d="M9 11h8"/>',
  },
  about: {
    innerMarkup:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  },
  instructions: {
    innerMarkup:
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  },
  contact: {
    innerMarkup:
      '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  },
  code: {
    innerMarkup:
      '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  },
  "new-maze": {
    innerMarkup:
      '<path d="M4 4h16v16H4z"/><path d="M8 4v4h4V4"/><path d="M12 8v4h4V8"/><path d="M8 12v4h4v-4"/>',
  },
  windows: {
    innerMarkup:
      '<path d="M3 4.5 11 3v8H3Z"/><path d="M13 3l8-1.5v9h-8Z"/><path d="M3 12h8v9L3 19.5Z"/><path d="M13 12h8v10.5L13 21Z"/>',
  },
  apple: {
    svgClass: "brand-icon",
    innerMarkup:
      '<path d="M16.04 12.11c.03 3.03 2.66 4.04 2.69 4.05-.02.07-.42 1.45-1.37 2.87-.82 1.23-1.68 2.45-3.02 2.47-1.32.03-1.75-.78-3.27-.78-1.52 0-2 .75-3.24.8-1.3.05-2.3-1.3-3.13-2.52-1.7-2.46-3-6.96-1.26-10 .86-1.49 2.4-2.43 4.06-2.45 1.26-.02 2.45.85 3.27.85.82 0 2.37-1.05 3.99-.9.68.03 2.59.27 3.82 2.07-.1.06-2.28 1.33-2.25 3.54ZM14.71 4.8c.69-.83 1.15-2 1.02-3.16-.99.04-2.17.66-2.88 1.49-.64.73-1.2 1.91-1.05 3.04 1.1.08 2.22-.56 2.91-1.37Z"/>',
  },
  debian: {
    svgClass: "brand-icon",
    innerMarkup:
      '<path d="M12 2.2c-2.1 0-3.8 1.78-3.8 3.97 0 1.24.54 2.36 1.4 3.09a3.9 3.9 0 0 0-2.26 3.53c0 2.5 2.1 4.52 4.66 4.52s4.66-2.02 4.66-4.52a3.9 3.9 0 0 0-2.26-3.53 4.04 4.04 0 0 0 1.4-3.09c0-2.19-1.7-3.97-3.8-3.97Zm-1.43 3.5c.35 0 .64.3.64.67a.66.66 0 0 1-.64.68.66.66 0 0 1-.63-.68c0-.37.28-.67.63-.67Zm2.86 0c.35 0 .63.3.63.67 0 .38-.28.68-.63.68a.66.66 0 0 1-.64-.68c0-.37.29-.67.64-.67Zm-1.43 2.18c.74 0 1.33.54 1.33 1.22 0 .67-.6 1.21-1.33 1.21-.74 0-1.34-.54-1.34-1.21 0-.68.6-1.22 1.34-1.22Zm-4.62 9.03c-.95 0-1.73.75-1.73 1.67 0 .93.78 1.68 1.73 1.68.96 0 1.73-.75 1.73-1.68 0-.92-.77-1.67-1.73-1.67Zm9.24 0c-.95 0-1.73.75-1.73 1.67 0 .93.78 1.68 1.73 1.68.95 0 1.73-.75 1.73-1.68 0-.92-.78-1.67-1.73-1.67Z"/>',
  },
};

/**
 * Inner SVG markup for `<primary-button>` icons, keyed by `icon` attribute.
 *
 * @type {Record<string, string>}
 */
export const PRIMARY_BUTTON_ICON_INNER_HTML = {
  "enter-downloads":
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  "back-home":
    '<polyline points="15 18 9 12 15 6"/><line x1="9" x2="21" y1="12" y2="12"/>',
};

/**
 * Inner SVG markup for the `<menu-toggle-button>` hamburger icon.
 * Used by `svgElementFromInnerMarkup` in `control-host.js`.
 */
export const HAMBURGER_INNER =
  '<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>';

/**
 * Inner SVG markup for `<carousel-arrow-button>`, keyed by `arrow` attribute.
 *
 * @type {Record<"left" | "right", string>}
 */
export const CAROUSEL_ARROW_INNER = {
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
};

/**
 * Full inner HTML for the `<theme-toggle-button>` control: a `<menu-card>`
 * shell containing sun (light mode) and moon (dark mode) SVG views.
 * Inserted via `insertAdjacentHTML`.
 */
export const THEME_TOGGLE_INNER_HTML = `
  <span class="menu-card">
    <span class="menu-card__face menu-card__face--back" aria-hidden="true"></span>
    <span class="menu-card__face menu-card__face--front">
      <span class="theme-toggle-views">
        <span class="theme-toggle-view theme-toggle-view--to-light">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
          </svg>
          <span class="btn__label">LIGHT MODE</span>
        </span>
        <span class="theme-toggle-view theme-toggle-view--to-dark">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span class="btn__label">DARK MODE</span>
        </span>
      </span>
    </span>
  </span>
`;
