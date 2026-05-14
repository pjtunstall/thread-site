import {
  createInnerButtonOrAnchor,
  finalizeControlHost,
  mirrorHostAttributesExcept,
  svgElementFromInnerMarkup,
} from "../shared/control-host.js";
import { CAROUSEL_ARROW_INNER } from "../shared/svg-icons.js";

const LOG_PREFIX = "[carousel-arrow-button]";
const HOST_ATTR_SKIP = new Set(["arrow"]);

export function defineCarouselArrowButton() {
  if (customElements.get("carousel-arrow-button")) {
    return;
  }

  class CarouselArrowButton extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const dir = this.getAttribute("arrow");
      if (dir !== "left" && dir !== "right") {
        console.error(
          `${LOG_PREFIX} Missing or invalid "arrow" attribute (use "left" or "right").`,
          this,
        );
        return;
      }

      const control = createInnerButtonOrAnchor(this);
      control.className = `carousel-arrow carousel-arrow--${dir}`;
      mirrorHostAttributesExcept(this, control, { skip: HOST_ATTR_SKIP });

      const inner = CAROUSEL_ARROW_INNER[dir];
      const svg = svgElementFromInnerMarkup(inner);
      if (svg) svg.setAttribute("aria-hidden", "true");
      if (svg) control.append(svg);

      finalizeControlHost(this, control);
    }
  }

  try {
    customElements.define("carousel-arrow-button", CarouselArrowButton);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
