(function () {
  const downloadsPath = new URL("./downloads", location.href).pathname;
  const view = location.pathname === downloadsPath ? "downloads" : "home";
  document.documentElement.setAttribute("data-initial-view", view);
})();
