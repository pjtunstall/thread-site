import { MazeBackground } from "./maze-background.js";
import { initDialogs } from "./dialogs.js";
import { defineMenuCard } from "./menu-card.js";
import { applyStoredThemePreference } from "./theme.js";

const DOWNLOAD_FILES = {
  windows: "by-a-thread-windows-placeholder.txt",
  "macos-apple-silicon": "by-a-thread-macos-apple-silicon-placeholder.txt",
  "macos-intel": "by-a-thread-macos-intel-placeholder.txt",
  "linux-appimage": "by-a-thread-linux-appimage-placeholder.txt",
  "linux-deb": "by-a-thread-linux-deb-placeholder.txt",
  "linux-rpm": "by-a-thread-linux-rpm-placeholder.txt",
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
          "The Apple Silicon build is downloading. Open the downloaded ",
          { type: "code", text: ".dmg" },
          ", drag the game into Applications, then launch it. If macOS blocks it, open System Settings, Privacy and Security, and allow the app.",
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
          "The macOS Intel build is downloading. Open the downloaded ",
          { type: "code", text: ".dmg" },
          ", copy the game to Applications, and start it from there. If Gatekeeper blocks it, allow it from Privacy and Security.",
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

function triggerPlaceholderDownload(platform) {
  const fileName = DOWNLOAD_FILES[platform];
  if (!fileName) {
    console.warn(`[downloads] Missing placeholder file name for ${platform}.`);
    return;
  }

  // Placeholder behavior until real hosted files are wired in.
  console.info(`[downloads] Placeholder download triggered: ${platform}`);

  const fileContent = `Placeholder download for ${platform}.
Replace this logic in downloads.js with the real build artifact URL.`;
  const blob = new Blob([fileContent], { type: "text/plain" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
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
    const dialog = dialogCandidate instanceof HTMLDialogElement ? dialogCandidate : null;

    button.addEventListener("click", function () {
      if (!platform) return;
      triggerPlaceholderDownload(platform);
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

  initDialogs({ dialogs: DOWNLOAD_DIALOGS });
  initPlatformDownloads();
})();
