// Wait for Neucha (hero title/tagline) before first paint animations. On the
// downloads view, also wait for Macondo (note + platform labels).
(function () {
  const fonts = [document.fonts.load('400 1rem "Neucha"')];
  if (
    document.documentElement.getAttribute("data-initial-view") === "downloads"
  ) {
    fonts.push(document.fonts.load('400 1rem "Macondo"'));
  }

  // We use `finally` here rather than `then` because, if the promise rejects
  // and we need a fallback font, we want to proceed to display the page anyway.
  Promise.all(fonts).finally(() => {
    document.documentElement.classList.add("fonts-ready");
  });
})();
