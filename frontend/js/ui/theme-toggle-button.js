import {
  createInnerButtonOrAnchor,
  finalizeControlHost,
  mirrorHostAttributesExcept,
} from "../shared/control-host.js";
import { THEME_TOGGLE_INNER_HTML } from "../shared/svg-icons.js";

const LOG_PREFIX = "[theme-toggle-button]";
const HOST_ATTR_SKIP = new Set(["data-theme-toggle"]);

export function defineThemeToggleButton() {
  if (customElements.get("theme-toggle-button")) {
    return;
  }

  class ThemeToggleButton extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const control = createInnerButtonOrAnchor(this);
      control.className = "btn btn--ghost";
      mirrorHostAttributesExcept(this, control, { skip: HOST_ATTR_SKIP });
      control.setAttribute("data-theme-toggle", "");
      control.insertAdjacentHTML("beforeend", THEME_TOGGLE_INNER_HTML);

      finalizeControlHost(this, control);
    }
  }

  try {
    customElements.define("theme-toggle-button", ThemeToggleButton);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
