import {
  createInnerButtonOrAnchor,
  finalizeControlHost,
  mirrorHostAttributesExcept,
} from "../shared/control-host.js";

const LOG_PREFIX = "[menu-button]";
const HOST_ATTR_SKIP = new Set(["label", "icon"]);

export function defineMenuButton() {
  if (customElements.get("menu-button")) {
    return;
  }

  class MenuButton extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const label = this.getAttribute("label") ?? "";
      const icon = this.getAttribute("icon") ?? "";
      if (!icon) {
        console.error(`${LOG_PREFIX} Missing required "icon" attribute.`, this);
      }

      const control = createInnerButtonOrAnchor(this);
      control.className = "btn btn--ghost";
      mirrorHostAttributesExcept(this, control, { skip: HOST_ATTR_SKIP });

      const card = document.createElement("menu-card");
      card.setAttribute("label", label);
      if (icon) card.setAttribute("data-menu-icon", icon);
      control.append(card);

      finalizeControlHost(this, control);
    }
  }

  try {
    customElements.define("menu-button", MenuButton);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
