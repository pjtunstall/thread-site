import { Maze } from "../maze/maze.js";
import { initCarousel } from "../ui/carousel.js";
import { initDialogs, MAIN_MENU_DIALOGS } from "../ui/dialogs.js";
import { initMenu } from "../ui/menu.js";
import { defineSiteControlElements } from "../ui/site-controls.js";
import { initTheme } from "../ui/theme.js";
import {
  DOWNLOAD_DIALOGS,
  initPlatformDownloads,
  resetDownloadsNavCards,
  revealDownloadsNavCards,
} from "./downloads.js";

const HOME_URL = new URL("./", location.href);
const DOWNLOADS_URL = new URL("./downloads", location.href);

const homeView = document.querySelector('[data-view="home"]');
const downloadsView = document.querySelector('[data-view="downloads"]');
if (
  !(homeView instanceof HTMLElement) ||
  !(downloadsView instanceof HTMLElement)
) {
  throw new Error(
    "[site-init] Missing view roots [data-view=home] or [data-view=downloads].",
  );
}

defineSiteControlElements();

const enterLabyrinth = document.querySelector(".view-home .hero-cta a");

/**
 * @param {string} pathname
 * @returns {"home" | "downloads"}
 */
function viewForPathname(pathname) {
  return pathname === DOWNLOADS_URL.pathname ? "downloads" : "home";
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function isAppPathname(pathname) {
  return pathname === HOME_URL.pathname || pathname === DOWNLOADS_URL.pathname;
}

/**
 * @param {HTMLElement} root
 * @param {Element | null} node
 * @returns {boolean}
 */
function containsOrIs(root, node) {
  return node instanceof Node && (root === node || root.contains(node));
}

/**
 * @param {HTMLElement} scope
 */
function focusFirstInScope(scope) {
  const candidates = scope.querySelectorAll(
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
  );
  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest("[hidden], [inert]")) continue;
    el.focus({ preventScroll: true });
    return;
  }
}

/**
 * This function switches the visible SPA view. It only changes the DOM, not the
 * URL as this has already been handled for all navigation types. Callers match
 * the view to the address bar: `applyPathToView()` on page load, or the
 * intercepted `navigate` handler for `<a href>` links and browser back/forward.
 *
 * @param {"home" | "downloads"} view
 */
function setView(view) {
  if (view === "downloads") {
    homeView.hidden = true;
    homeView.setAttribute("inert", "");
    homeView.setAttribute("aria-hidden", "true");

    downloadsView.hidden = false;
    downloadsView.removeAttribute("inert");
    downloadsView.setAttribute("aria-hidden", "false");

    resetDownloadsNavCards();
    revealDownloadsNavCards();

    if (containsOrIs(homeView, document.activeElement)) {
      focusFirstInScope(downloadsView);
    }
    return;
  }

  homeView.hidden = false;
  homeView.removeAttribute("inert");
  homeView.setAttribute("aria-hidden", "false");

  downloadsView.hidden = true;
  downloadsView.setAttribute("inert", "");
  downloadsView.setAttribute("aria-hidden", "true");

  resetDownloadsNavCards();

  if (containsOrIs(downloadsView, document.activeElement)) {
    if (enterLabyrinth instanceof HTMLAnchorElement) {
      enterLabyrinth.focus({ preventScroll: true });
    } else {
      focusFirstInScope(homeView);
    }
  }
}

const maze = new Maze();
maze.start();
const newMazeButton = document.querySelector("button[data-new-maze]");
if (newMazeButton instanceof HTMLButtonElement) {
  newMazeButton.addEventListener("click", () => {
    maze.restart();
  });
}

initTheme({
  onThemeChange: () => {
    // If the theme changes while the maze is still being drawn, repaint where
    // we got up to in the new colors. The method returns immediately if no
    // canvas context of the correct type exists or if a complete maze is
    // already displayed. The latter condition will always be true when
    // browser settings indicate that the user prefers reduced motion.
    maze.repaintCurrentPartialState();
  },
});

try {
  initMenu();
} catch (e) {
  console.error(e);
}

initCarousel();

initDialogs({
  dialogs: MAIN_MENU_DIALOGS.concat(DOWNLOAD_DIALOGS),
});
initPlatformDownloads();

// Set view on navigation events: browser forward or back buttons, or clicking
// on in-app buttons "Enter the labyrinth" to move from "home" to "downloads", or "Back to main
// page" to move from "downloads" to "home" (both of which rely on `href` to get
// the destination URL).
navigation.addEventListener("navigate", (event) => {
  if (!event.canIntercept || event.hashChange || event.downloadRequest) {
    return;
  }

  const dest = new URL(event.destination.url);

  // Return before intercepting if the destination is off site. (Actually if the
  // desitination has a different origin, but in practice this means off site; There's no reason for the scheme or port to change.)
  if (dest.origin !== location.origin) return;

  // Likewise if the destination is not recognized.
  if (!isAppPathname(dest.pathname)) return;

  event.intercept({
    handler() {
      setView(viewForPathname(dest.pathname));
    },
  });
});

// Set view on initial page load, based on URL: `/` or `/downloads`.
function applyPathToView() {
  setView(viewForPathname(location.pathname));
}
applyPathToView();
