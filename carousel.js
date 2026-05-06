const CAROUSEL_ITEMS = [
  {
    src: "./screenshot.jpg",
    alt: "By a Thread game screenshot featuring a maze with Minoan-style octopus frescoes",
  },
  {
    src: "./assets/images/griffin.webp",
    alt: "By a Thread game screencast featuring the Minoan griffin fresco from Knossos",
  },
  {
    src: "./assets/images/circuits.jpg",
    alt: "By a Thread game screenshot featuring glowing circuits on a Minoan-style fresco",
  },
  {
    src: "./assets/images/ants.jpg",
    alt: "By a Thread game screenshot featuring a maze with Minoan-style ant frescoes",
  },
  {
    src: "./assets/images/octopus.webp",
    alt: "By a Thread screencast featuring a maze of Minoan-style octopus frescoes",
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
