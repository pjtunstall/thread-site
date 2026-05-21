(function () {
  function normalizePathname(pathname) {
    if (pathname.length > 1 && pathname.endsWith("/")) {
      return pathname.slice(0, -1);
    }
    return pathname;
  }
  const view =
    normalizePathname(location.pathname) === "/downloads" ? "downloads" : "home";
  document.documentElement.setAttribute("data-initial-view", view);
})();
