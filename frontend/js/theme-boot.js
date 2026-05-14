(function () {
  try {
    const stored = localStorage.getItem("theme-preference");
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", resolved);
  } catch (_) {}
})();
