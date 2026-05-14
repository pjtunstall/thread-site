import { MazeBackground } from "../maze/maze.js";
import { initCarousel } from "../ui/carousel.js";
import { initDialogs, MAIN_MENU_DIALOGS } from "../ui/dialogs.js";
import { defineMenuCard } from "../ui/menu-card.js";
import { initMenu } from "../ui/menu.js";
import { initTheme } from "../ui/theme.js";
import {
  DOWNLOAD_DIALOGS,
  initPlatformDownloads,
  resetDownloadsNavCards,
  revealDownloadsNavCards,
} from "./downloads.js";

const HASH_DOWNLOADS = "#downloads";

(function () {
  const homeView = document.querySelector('[data-view="home"]');
  const downloadsView = document.querySelector('[data-view="downloads"]');
  const backButton = document.querySelector("[data-back-to-home]");
  const enterLabyrinth = document.querySelector(".view-home .hero-cta a");

  if (
    !(homeView instanceof HTMLElement) ||
    !(downloadsView instanceof HTMLElement)
  ) {
    console.error(
      "[site-init] Missing view roots [data-view=home] or [data-view=downloads].",
    );
    return;
  }

  function clearHashFromUrl() {
    const withoutHash = window.location.href.split("#")[0];
    window.history.replaceState(null, "", withoutHash);
    if (window.location.hash === HASH_DOWNLOADS) {
      window.location.hash = "";
    }
  }

  function setHashDownloads() {
    if (window.location.hash !== HASH_DOWNLOADS) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${HASH_DOWNLOADS}`,
      );
    }
  }

  /**
   * @param {HTMLElement} root
   * @param {Element | null} node
   */
  function containsOrIs(root, node) {
    return node instanceof Node && (root === node || root.contains(node));
  }

  /**
   * @param {HTMLElement} scope
   */
  function focusFirstInScope(scope) {
    const candidates = scope.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
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
   * @param {"home" | "downloads"} view
   * @param {{ syncUrl?: boolean }} [options]
   */
  function setView(view, options) {
    const syncUrl = options?.syncUrl !== false;

    if (view === "downloads") {
      homeView.hidden = true;
      homeView.setAttribute("inert", "");
      homeView.setAttribute("aria-hidden", "true");

      downloadsView.hidden = false;
      downloadsView.removeAttribute("inert");
      downloadsView.setAttribute("aria-hidden", "false");

      if (syncUrl) {
        setHashDownloads();
      }
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

    if (syncUrl) {
      clearHashFromUrl();
    }

    if (containsOrIs(downloadsView, document.activeElement)) {
      if (enterLabyrinth instanceof HTMLAnchorElement) {
        enterLabyrinth.focus({ preventScroll: true });
      } else {
        focusFirstInScope(homeView);
      }
    }
  }

  function applyHashToView() {
    if (window.location.hash === HASH_DOWNLOADS) {
      setView("downloads", { syncUrl: false });
    } else {
      setView("home", { syncUrl: false });
    }
  }

  window.addEventListener("hashchange", function () {
    applyHashToView();
  });

  if (backButton instanceof HTMLButtonElement) {
    backButton.addEventListener("click", function () {
      setView("home");
    });
  }

  // Same-document fragment clicks do not fire hashchange when the URL is
  // already #downloads (e.g. hash not cleared). Drive the view explicitly
  // for unmodified primary clicks; keep default for modifiers / middle-click.
  if (enterLabyrinth instanceof HTMLAnchorElement) {
    enterLabyrinth.addEventListener("click", function (e) {
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      setView("downloads", { syncUrl: true });
    });
  }

  const mazeBackground = new MazeBackground();
  mazeBackground.start();
  const newMazeButton = document.querySelector("[data-new-maze]");
  if (newMazeButton instanceof HTMLButtonElement) {
    newMazeButton.addEventListener("click", function () {
      mazeBackground.restart();
    });
  }

  defineMenuCard();

  initTheme({
    onThemeChange: function () {
      mazeBackground.repaintCurrentState();
    },
  });
  initCarousel();
  initMenu();

  initDialogs({
    dialogs: MAIN_MENU_DIALOGS.concat(DOWNLOAD_DIALOGS),
  });
  initPlatformDownloads();

  applyHashToView();
})();
