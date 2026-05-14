import {
  createInnerButtonOrAnchor,
  finalizeControlHost,
  mirrorHostAttributesExcept,
  svgElementFromInnerMarkup,
} from "../shared/control-host.js";
import { HAMBURGER_INNER } from "../shared/svg-icons.js";

const LOG_PREFIX = "[menu-toggle-button]";
const HOST_ATTR_SKIP = new Set(["data-menu-toggle"]);

export function defineMenuToggleButton() {
  if (customElements.get("menu-toggle-button")) {
    return;
  }

  class MenuToggleButton extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const control = createInnerButtonOrAnchor(this);
      control.className = "btn btn--ghost menu-toggle";
      mirrorHostAttributesExcept(this, control, { skip: HOST_ATTR_SKIP });
      control.setAttribute("data-menu-toggle", "");

      const svg = svgElementFromInnerMarkup(HAMBURGER_INNER);
      if (svg) svg.setAttribute("aria-hidden", "true");
      if (svg) control.append(svg);

      finalizeControlHost(this, control);
    }
  }

  try {
    customElements.define("menu-toggle-button", MenuToggleButton);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
