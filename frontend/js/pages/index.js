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

const HOME_PATH = "/";
const DOWNLOADS_PATH = "/downloads";

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

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

defineSiteControlElements();

const enterLabyrinth = document.querySelector(".view-home .hero-cta a");

/**
 * @param {string} pathname
 */
function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * @param {string} pathname
 * @returns {"home" | "downloads"}
 */
function viewForPathname(pathname) {
  return normalizePathname(pathname) === DOWNLOADS_PATH ? "downloads" : "home";
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function isAppPathname(pathname) {
  const path = normalizePathname(pathname);
  return path === HOME_PATH || path === DOWNLOADS_PATH;
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
 * @param {{ revealDownloadsCards?: boolean }} [options]
 */
function setView(view, options = {}) {
  document.documentElement.removeAttribute("data-initial-view");

  const revealDownloadsCards = options.revealDownloadsCards !== false;

  if (view === "downloads") {
    homeView.hidden = true;
    homeView.setAttribute("inert", "");
    homeView.setAttribute("aria-hidden", "true");

    downloadsView.hidden = false;
    downloadsView.removeAttribute("inert");
    downloadsView.setAttribute("aria-hidden", "false");

    resetDownloadsNavCards();
    if (revealDownloadsCards) {
      revealDownloadsNavCards();
    }

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

/**
 * Swap home/downloads views, with a View Transition when supported and allowed.
 *
 * @param {"home" | "downloads"} view
 * @returns {Promise<void>}
 */
async function runViewChange(view) {
  if (
    reduceMotionQuery.matches ||
    typeof document.startViewTransition !== "function"
  ) {
    setView(view);
    return;
  }

  const deferDownloadsCardReveal = view === "downloads";

  const transition = document.startViewTransition(() => {
    setView(view, { revealDownloadsCards: !deferDownloadsCardReveal });
  });
  await transition.finished;
  if (deferDownloadsCardReveal) {
    revealDownloadsNavCards();
  }
}

const maze = new Maze();
try {
  maze.start();
} catch (e) {
  console.error(e);
}
const newMazeButton = document.querySelector("button[data-new-maze]");
if (newMazeButton instanceof HTMLButtonElement) {
  newMazeButton.addEventListener("click", () => {
    maze.restart();
  });
}

initTheme({
  onThemeChange: () => {
    // If the theme changes while the maze is still being carved, repaint tiles
    // carved so far in the new colors. The method returns immediately if no
    // canvas context of the correct type exists or if nothing has been carved
    // yet. When the user prefers reduced motion, the full maze is carved in one
    // go at restart, so a theme toggle repaints that complete maze.
    maze.repaintPartialMazeAfterThemeToggle();
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
// on in-app buttons "Enter the labyrinth" to move from "home" to "downloads",
// or "Back to main page" to move from "downloads" to "home" (both of which rely
// on `href` to get the destination URL).
navigation.addEventListener("navigate", (event) => {
  if (!event.canIntercept || event.hashChange || event.downloadRequest) {
    return;
  }

  const dest = new URL(event.destination.url);

  // Return before intercepting if the destination is off site. (Strictly
  // speaking, return if the desitination has a different origin, but in
  // practice that would imply off site; there's no reason for my scheme or port
  // to change.)
  if (dest.origin !== location.origin) return;

  // Likewise if the destination is not recognized.
  if (!isAppPathname(dest.pathname)) return;

  event.intercept({
    handler() {
      return runViewChange(viewForPathname(dest.pathname));
    },
  });
});

/** Longest initial title/tagline entrance (tagline delay + fade-in-up
 * duration). */
const INITIAL_ENTRANCE_MS = 1000;

/**
 * @param {() => void} callback
 */
function whenFontsReady(callback) {
  if (document.documentElement.classList.contains("fonts-ready")) {
    callback();
    return;
  }
  const observer = new MutationObserver(() => {
    if (document.documentElement.classList.contains("fonts-ready")) {
      observer.disconnect();
      callback();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

/**
 * One-shot entrance for hero title/tagline on first paint. Pose matches
 * fade-in-up "from" (02-main.css); animation starts after the view is visible.
 *
 * @param {"home" | "downloads"} view
 */
function scheduleInitialEntrance(view) {
  if (reduceMotionQuery.matches) return;
  const section = view === "downloads" ? downloadsView : homeView;
  section.classList.add("initial-entrance");

  const startAnimation = () => {
    // Two frames: the first to paint the posed state (opacity 0, translateY),
    //and the second to starts the fade-in-up.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        section.classList.add("initial-entrance--run");
      });
    });
  };

  window.setTimeout(() => {
    section.classList.remove("initial-entrance", "initial-entrance--run");
  }, INITIAL_ENTRANCE_MS);

  whenFontsReady(startAnimation);
}

// First paint only: no View Transition; card flips run inside setView when on
// downloads.
function applyPathToView() {
  const view = viewForPathname(location.pathname);
  setView(view);
  scheduleInitialEntrance(view);
}
applyPathToView();
