import {
  createInnerButtonOrAnchor,
  finalizeControlHost,
  mirrorHostAttributesExcept,
  svgElementFromInnerMarkup,
} from "../shared/control-host.js";
import { PRIMARY_BUTTON_ICON_INNER_HTML } from "../shared/svg-icons.js";

const LOG_PREFIX = "[primary-button]";
const HOST_ATTR_SKIP = new Set(["label", "icon"]);

export function definePrimaryButton() {
  if (customElements.get("primary-button")) {
    return;
  }

  class PrimaryButton extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const label = this.getAttribute("label") ?? "";
      const icon = this.getAttribute("icon") ?? "";
      if (!icon) {
        console.error(`${LOG_PREFIX} Missing required "icon" attribute.`, this);
      }

      const control = createInnerButtonOrAnchor(this);
      control.className = "btn btn--primary";
      mirrorHostAttributesExcept(this, control, { skip: HOST_ATTR_SKIP });

      const inner = PRIMARY_BUTTON_ICON_INNER_HTML[icon];
      if (!inner) {
        console.error(`${LOG_PREFIX} Unknown icon "${icon}".`, this);
      } else {
        const svg = svgElementFromInnerMarkup(inner);
        if (svg) {
          svg.setAttribute("aria-hidden", "true");
          control.append(svg);
        }
      }

      const labelSpan = document.createElement("span");
      labelSpan.className = "btn__label";
      labelSpan.textContent = label;
      control.append(labelSpan);

      finalizeControlHost(this, control);
    }
  }

  try {
    customElements.define("primary-button", PrimaryButton);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
