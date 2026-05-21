const CAROUSEL_ITEMS = [
  {
    src: "./screenshot.jpg",
    alt: "By a Thread game screenshot featuring a maze with Minoan-style octopus frescoes",
  },
  {
    src: "./assets/images/antikythera.jpg",
    alt: "By a Thread game screenshot featuring the player avatar as a bronze sphere with mechanical surface features in the style of the Antikythera Mechanism",
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
    src: "./assets/images/octopus.webp",
    alt: "By a Thread screencast featuring a maze of Minoan-style octopus frescoes",
  },
  {
    src: "./assets/images/ants.jpg",
    alt: "By a Thread game screenshot featuring a maze with Minoan-style ant frescoes",
  },
  {
    src: "./assets/images/marble.jpg",
    alt: "By a Thread game screenshot featuring a maze with black marble walls under a starry sky",
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

  const render = () => {
    const item = CAROUSEL_ITEMS[currentIndex];
    image.src = item.src;
    image.alt = item.alt;
    if (currentIndex === 0) {
      image.setAttribute("fetchpriority", "high");
    } else {
      image.setAttribute("fetchpriority", "low");
    }
  };

  const warmImageCache = () => {
    CAROUSEL_ITEMS.forEach((item, index) => {
      if (index === currentIndex) return;
      const preloadImage = new Image();
      preloadImage.decoding = "async";
      preloadImage.fetchPriority = "low";
      preloadImage.src = item.src;
    });
  };

  /**
   * @param {number} delta
   */
  const moveBy = (delta) => {
    currentIndex =
      (currentIndex + delta + CAROUSEL_ITEMS.length) % CAROUSEL_ITEMS.length;
    render();
  };

  /**
   * @param {EventTarget | null} target
   * @returns {boolean}
   */
  const isTypingTarget = (target) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.isContentEditable) {
      return true;
    }

    const tagName = target.tagName;
    return (
      tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT"
    );
  };

  /**
   * @param {KeyboardEvent} event
   */
  const onKeydown = (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const isDialogDismissKey =
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "Escape";
    if (!isDialogDismissKey) {
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const openDialogs = document.querySelectorAll("dialog[data-dialog][open]");
    const openDialog = openDialogs[openDialogs.length - 1];
    if (openDialog instanceof HTMLDialogElement) {
      event.preventDefault();
      openDialog.close();
      return;
    }

    if (event.key === "Escape") {
      return;
    }

    event.preventDefault();
    if (event.key === "ArrowLeft") {
      moveBy(-1);
    } else {
      moveBy(1);
    }
  };

  prevButton.addEventListener("click", () => {
    moveBy(-1);
  });

  nextButton.addEventListener("click", () => {
    moveBy(1);
  });

  document.addEventListener("keydown", onKeydown);

  render();
  warmImageCache();
}
