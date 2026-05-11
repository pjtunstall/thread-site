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

function buildMacosDownloadBody(zipFileName) {
  return [
    {
      type: "paragraph",
      parts: [
        "When ",
        { type: "code", text: zipFileName },
        " has finished downloading, double-click the archive to extract it. Drag ",
        { type: "code", text: "ByAThread.app" },
        " into ",
        { type: "strong", text: "Applications" },
        " if you want it there (optional).",
      ],
    },
    {
      type: "paragraph",
      parts: [
        "Downloads from the browser get a ",
        { type: "strong", text: "quarantine" },
        " flag, so ",
        { type: "strong", text: "Gatekeeper" },
        " may stop a plain double-click until you confirm you trust the app.",
      ],
    },
    {
      type: "paragraph",
      parts: [
        { type: "strong", text: "First try this:" },
        " Right-click ",
        { type: "code", text: "ByAThread.app" },
        ", choose ",
        { type: "strong", text: "Open" },
        ", then click ",
        { type: "strong", text: "Open" },
        " in the dialog. After that, a normal double-click should work.",
      ],
    },
    {
      type: "paragraph",
      parts: [
        { type: "strong", text: "If it's still blocked:" },
        " Open ",
        { type: "strong", text: "System Settings" },
        " > ",
        { type: "strong", text: "Privacy & Security" },
        " and allow ",
        { type: "strong", text: "ByAThread" },
        ".",
      ],
    },
  ];
}

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
          " has finished downloading, extract the archive, open the ",
          { type: "strong", text: "ByAThread" },
          " folder, and launch ",
          { type: "code", text: "ByAThread.exe" },
          ".",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "On the first launch, SmartScreen may block it. (The default is to treat any download that hasn't been registered with Microsoft as a virus till you confirm otherwise.) Click ",
          { type: "strong", text: "More info" },
          ", then ",
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
    body: buildMacosDownloadBody("ByAThread-macos-silicon.zip"),
  },
  {
    id: "dlg-download-macos-intel",
    title: "macOS Intel",
    noBackdropClose: true,
    body: buildMacosDownloadBody("ByAThread-macos-intel.zip"),
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
          " has finished downloading, install with your distro tools when you can, for example ",
          {
            type: "code",
            text: "sudo dnf install ./ByAThread-linux.rpm",
          },
          " on Fedora or ",
          {
            type: "code",
            text: "sudo zypper install ./ByAThread-linux.rpm",
          },
          " on openSUSE.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Otherwise use ",
          {
            type: "code",
            text: "sudo rpm -Uvh ./ByAThread-linux.rpm",
          },
          ".",
        ],
      },
      {
        type: "paragraph",
        parts: ["Then launch the game from your app menu."],
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
          { type: "strong", text: "With AppImageLauncher (recommended):" },
          " Install ",
          {
            type: "link",
            href: "https://github.com/TheAssassin/AppImageLauncher/releases",
            text: "AppImageLauncher",
          },
          ", double-click ",
          { type: "code", text: "ByAThread-linux.AppImage" },
          ", choose ",
          { type: "strong", text: "Integrate" },
          " when prompted, then launch the game from your app menu.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          { type: "strong", text: "Without AppImageLauncher:" },
          " Mark ",
          { type: "code", text: "ByAThread-linux.AppImage" },
          " as executable: in your file manager, right-click the file, open ",
          { type: "strong", text: "Properties" },
          " > ",
          { type: "strong", text: "Permissions" },
          ", and enable ",
          { type: "strong", text: "Allow executing file as program" },
          ". Then double-click to run.",
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
