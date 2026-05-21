(function () {
  function themeFromSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  let resolved = themeFromSystemPreference();
  try {
    const stored = localStorage.getItem("theme-preference");
    if (stored === "light" || stored === "dark") {
      resolved = stored;
    }
  } catch (_) {}

  document.documentElement.setAttribute("data-theme", resolved);
})();
