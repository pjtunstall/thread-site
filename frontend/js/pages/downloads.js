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

export const DOWNLOAD_DIALOGS = [
  {
    id: "dlg-download-windows",
    title: "Windows",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "When ",
          { type: "code", text: "ByAThread-windows.zip" },
          " has finished downloading, extract the archive and launch ",
          { type: "code", text: "ByAThread.exe" },
          ". If SmartScreen warns you, choose ",
          { type: "strong", text: "More info" },
          " and then ",
          { type: "strong", text: "Run anyway" },
          ".",
        ],
      },
    ],
  },
  {
    id: "dlg-download-macos-apple-silicon",
    title: "macOS Apple Silicon",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "When ",
          { type: "code", text: "ByAThread-macos-silicon.zip" },
          " has finished downloading, double-click it to extract, drag ",
          { type: "code", text: "ByAThread.app" },
          " into Applications, then launch it. If macOS blocks it, open ",
          { type: "strong", text: "System Settings" },
          ", ",
          { type: "strong", text: "Privacy & Security" },
          ", and allow the app.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-macos-intel",
    title: "macOS Intel",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "When ",
          { type: "code", text: "ByAThread-macos-intel.zip" },
          " has finished downloading, double-click it to extract, drag ",
          { type: "code", text: "ByAThread.app" },
          " into Applications, then launch it. If Gatekeeper blocks it, allow it from ",
          { type: "strong", text: "Privacy & Security" },
          ".",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-appimage",
    title: "Linux AppImage",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "Install ",
          {
            type: "link",
            href: "https://github.com/TheAssassin/AppImageLauncher/releases",
            text: "AppImageLauncher",
          },
          ". Then double-click ",
          { type: "code", text: "ByAThread-linux.AppImage" },
          " and choose ",
          { type: "strong", text: "Integrate and run" },
          ". Finally, right-click it and select ",
          { type: "strong", text: "Properties" },
          " > ",
          { type: "strong", text: "Permissions" },
          " > ",
          {
            type: "strong",
            text: "Allow executing file as program",
          },
          ".",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-deb",
    title: "Linux .deb",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "When ",
          { type: "code", text: "ByAThread-linux.deb" },
          " has finished downloading, run ",
          {
            type: "code",
            text: "sudo apt install ./ByAThread-linux.deb",
          },
          ", then launch the game from your app menu.",
        ],
      },
    ],
  },
  {
    id: "dlg-download-linux-rpm",
    title: "Linux .rpm",
    noBackdropClose: true,
    body: [
      {
        type: "paragraph",
        parts: [
          "When ",
          { type: "code", text: "ByAThread-linux.rpm" },
          " has finished downloading, install it with your distro tools, for example ",
          {
            type: "code",
            text: "sudo dnf install ./ByAThread-linux.rpm",
          },
          " on Fedora, or ",
          { type: "code", text: "sudo rpm -i ./ByAThread-linux.rpm" },
          " elsewhere, then launch the game from your app menu.",
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

  const anchor = document.createElement("a");
  anchor.href = `${RELEASE_BASE}/${fileName}`;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function initPlatformDownloads() {
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

export function revealDownloadsNavCards() {
  const downloadsNav = document.querySelector(".downloads-nav");
  if (!(downloadsNav instanceof HTMLElement)) return;

  window.requestAnimationFrame(function () {
    downloadsNav.setAttribute("data-menu-open", "true");
  });
}

export function resetDownloadsNavCards() {
  const downloadsNav = document.querySelector(".downloads-nav");
  if (!(downloadsNav instanceof HTMLElement)) return;
  downloadsNav.removeAttribute("data-menu-open");
}
