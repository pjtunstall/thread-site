import { MazeBackground } from "./maze-background.js";
import { defineMenuCard } from "./menu-card.js";

const DOWNLOAD_FILES = {
  windows: "by-a-thread-windows-placeholder.txt",
  "macos-apple-silicon": "by-a-thread-macos-apple-silicon-placeholder.txt",
  "macos-intel": "by-a-thread-macos-intel-placeholder.txt",
  "linux-appimage": "by-a-thread-linux-appimage-placeholder.txt",
  "linux-deb": "by-a-thread-linux-deb-placeholder.txt",
  "linux-rpm": "by-a-thread-linux-rpm-placeholder.txt",
};

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

function initDialogs() {
  const dialogs = Array.from(document.querySelectorAll("dialog[data-dialog]"));
  dialogs.forEach(function (dialog) {
    if (!(dialog instanceof HTMLDialogElement)) return;

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-dialog-close]").forEach(function (element) {
      element.addEventListener("click", function () {
        dialog.close();
      });
    });
  });
}

function animateMenuCardsOnLoad() {
  const downloadsMenu = document.querySelector(".downloads-nav");
  if (!(downloadsMenu instanceof HTMLElement)) return;

  requestAnimationFrame(function () {
    downloadsMenu.setAttribute("data-menu-open", "true");
  });
}

(function () {
  const mazeBackground = new MazeBackground();
  mazeBackground.start();

  defineMenuCard();
  animateMenuCardsOnLoad();

  initPlatformDownloads();
  initDialogs();
})();
