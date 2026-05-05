const CAROUSEL_ITEMS = [
  {
    src: "./screenshot.jpg",
    alt: "By a Thread game screenshot",
  },
  {
    src: "./griffin.webp",
    alt: "By a Thread artwork featuring a griffin",
  },
  {
    src: "./octopus.webp",
    alt: "By a Thread artwork featuring an octopus",
  },
];

export function initCarousel() {
  const image = document.querySelector("[data-carousel-image]");
  const prevButton = document.querySelector("[data-carousel-prev]");
  const nextButton = document.querySelector("[data-carousel-next]");

  if (!image || !prevButton || !nextButton) {
    return;
  }

  let currentIndex = CAROUSEL_ITEMS.findIndex(
    (item) => item.src === image.getAttribute("src"),
  );
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  const render = function () {
    const item = CAROUSEL_ITEMS[currentIndex];
    image.src = item.src;
    image.alt = item.alt;
  };

  const warmImageCache = function () {
    CAROUSEL_ITEMS.forEach(function (item) {
      const preloadImage = new Image();
      preloadImage.decoding = "async";
      preloadImage.src = item.src;
    });
  };

  const moveBy = function (delta) {
    currentIndex =
      (currentIndex + delta + CAROUSEL_ITEMS.length) % CAROUSEL_ITEMS.length;
    render();
  };

  prevButton.addEventListener("click", function () {
    moveBy(-1);
  });

  nextButton.addEventListener("click", function () {
    moveBy(1);
  });

  render();
  warmImageCache();
}
