// The purpose of this script is to ensure that the font for the title and
// tagline is available before starting its animation on initial page load.
(function () {
  // We use `finally` here rather than `then` because, if the promise rejects
  // and we need a fallback font, we want to proceed to display the page anyway.
  document.fonts.load('400 1rem "Neucha"').finally(() => {
    document.documentElement.classList.add("fonts-ready");
  });
})();
