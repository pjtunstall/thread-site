import { MazeBackground } from "./maze-background.js";
import { initDialogs } from "./dialogs.js";
import { defineMenuCard } from "./menu-card.js";
import { applyStoredThemePreference } from "./theme.js";

// Base URL that always resolves to the latest published GitHub Release of
// the game. Each platform key maps to the asset filename uploaded by the
// game repo's release workflow; together they form the full download URL.
// New releases on GitHub are picked up automatically with no website
// redeploy required.
const RELEASE_BASE =
  "https://github.com/pjtunstall/by-a-thread/releases/latest/download";

const DOWNLOAD_FILES = {
  windows: "ByAThread-windows.zip",
  "macos-apple-silicon": "ByAThread-macos-silicon.zip",
  "macos-intel": "ByAThread-macos-intel.zip",
  "linux-appimage": "ByAThread-linux.AppImage",
  "linux-deb": "ByAThread-linux.deb",
  "linux-rpm": "ByAThread-linux.rpm",
};

const DOWNLOAD_DIALOGS = [
  {
    id: "dlg-download-windows",
    title: "Windows",
    body: [
      {
        type: "paragraph",
        parts: [
          "The Windows build has started downloading. When it finishes, extract the archive and launch ",
          { type: "code", text: "ByAThread.exe" },
          ". If SmartScreen warns you, choose More info and then Run anyway.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-macos-apple-silicon",
    title: "macOS Apple Silicon",
    body: [
      {
        type: "paragraph",
        parts: [
          "The Apple Silicon build is downloading. When it finishes, double-click the ",
          { type: "code", text: ".zip" },
          " to extract it, drag ",
          { type: "code", text: "ByAThread.app" },
          " into Applications, then launch it. If macOS blocks it, open System Settings, Privacy and Security, and allow the app.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-macos-intel",
    title: "macOS Intel",
    body: [
      {
        type: "paragraph",
        parts: [
          "The macOS Intel build is downloading. When it finishes, double-click the ",
          { type: "code", text: ".zip" },
          " to extract it, drag ",
          { type: "code", text: "ByAThread.app" },
          " into Applications, then launch it. If Gatekeeper blocks it, allow it from Privacy and Security.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-appimage",
    title: "Linux AppImage",
    body: [
      {
        type: "paragraph",
        parts: [
          "The AppImage download has started. Mark it executable before launching: ",
          { type: "code", text: "chmod +x ByAThread.AppImage" },
          ". Then run it directly from your file manager or terminal.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-deb",
    title: "Linux .deb",
    body: [
      {
        type: "paragraph",
        parts: [
          "The ",
          { type: "code", text: ".deb" },
          " package is downloading. Install with your package manager or run: ",
          { type: "code", text: "sudo apt install ./by-a-thread.deb" },
          ", then launch the game from your app menu.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-rpm",
    title: "Linux .rpm",
    body: [
      {
        type: "paragraph",
        parts: [
          "The ",
          { type: "code", text: ".rpm" },
          " package is downloading. Install it with your distro tools, for example: ",
          { type: "code", text: "sudo dnf install ./by-a-thread.rpm" },
          ", and launch from your applications menu.",
        ],
      },
    ],
  },
];

function triggerDownload(platform) {
  const fileName = DOWNLOAD_FILES[platform];
  if (!fileName) {
    console.warn(`[downloads] No file mapped for ${platform}.`);
    return;
  }

  // GitHub serves release assets with Content-Disposition: attachment, so
  // navigating to the URL produces a download rather than a page nav.
  const anchor = document.createElement("a");
  anchor.href = `${RELEASE_BASE}/${fileName}`;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function initPlatformDownloads() {
  const platformButtons = Array.from(
    document.querySelectorAll("[data-platform-download]"),
  );

  platformButtons.forEach(function (button) {
    if (!(button instanceof HTMLButtonElement)) return;

    const platform = button.dataset.platformDownload;
    const dialogId = button.dataset.dialogTarget;
    const dialogCandidate = dialogId ? document.getElementById(dialogId) : null;
    const dialog =
      dialogCandidate instanceof HTMLDialogElement ? dialogCandidate : null;

    button.addEventListener("click", function () {
      if (!platform) return;
      triggerDownload(platform);
      if (dialog) dialog.showModal();
    });
  });
}

function revealDownloadsNavCards() {
  const downloadsNav = document.querySelector(".downloads-nav");
  if (!(downloadsNav instanceof HTMLElement)) return;

  window.requestAnimationFrame(function () {
    downloadsNav.setAttribute("data-menu-open", "true");
  });
}

(function () {
  applyStoredThemePreference();

  const mazeBackground = new MazeBackground();
  mazeBackground.start();

  defineMenuCard();
  revealDownloadsNavCards();

  initDialogs({ dialogs: DOWNLOAD_DIALOGS, noBackdropClose: true });
  initPlatformDownloads();
})();
