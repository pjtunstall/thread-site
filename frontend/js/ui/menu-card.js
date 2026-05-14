import {
  MENU_CARD_ICON_BY_ID,
  MENU_CARD_SVG_VIEWBOX,
} from "../shared/svg-icons.js";

/** Markup for `<menu-card>` face; icons supplied via `data-menu-icon` /
 * `svg-icons.js`. */
const MENU_CARD_TEMPLATE_HTML = `
  <span class="menu-card__face menu-card__face--back" aria-hidden="true"></span>
  <span class="menu-card__face menu-card__face--front">
    <span class="btn__label" data-menu-card-label></span>
  </span>
`;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {import("../shared/svg-icons.js").MenuCardIconDef} def
 * @returns {SVGElement | null}
 */
function menuCardSvgFromIconDef(def) {
  const tpl = document.createElement("template");
  tpl.innerHTML = `<svg xmlns="${SVG_NS}" viewBox="${MENU_CARD_SVG_VIEWBOX}">${def.innerMarkup}</svg>`;
  const root = tpl.content.firstElementChild;
  if (!(root instanceof SVGElement)) return null;
  if (def.svgClass) root.setAttribute("class", def.svgClass);
  return root;
}

export function defineMenuCard() {
  if (customElements.get("menu-card")) {
    return; // Already defined.
  }

  const LOG_PREFIX = "[menu-card]";
  const templateId = "menu-card-template";
  let templateCandidate = document.querySelector(`#${templateId}`);
  if (!(templateCandidate instanceof HTMLTemplateElement)) {
    const template = document.createElement("template");
    template.id = templateId;
    template.innerHTML = MENU_CARD_TEMPLATE_HTML;
    document.body.append(template);
    templateCandidate = template;
  }

  const menuCardTemplate = templateCandidate;

  class MenuCard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const label = this.getAttribute("label") || "";
      const iconId = this.getAttribute("data-menu-icon");
      /** @type {SVGElement | null} */
      let icon = null;
      if (iconId) {
        const def = MENU_CARD_ICON_BY_ID[iconId];
        if (def) {
          icon = menuCardSvgFromIconDef(def);
        } else {
          console.error(
            `${LOG_PREFIX} Unknown data-menu-icon "${iconId}".`,
            this,
          );
        }
      }
      if (!icon) {
        const fromChild = this.querySelector("svg");
        if (fromChild instanceof SVGElement) icon = fromChild;
      }

      this.classList.add("menu-card");
      this.replaceChildren();

      const fragment = menuCardTemplate.content.cloneNode(true);
      const frontFaceCandidate = fragment.querySelector(
        ".menu-card__face--front",
      );
      const frontFace =
        frontFaceCandidate instanceof HTMLElement ? frontFaceCandidate : null;
      const labelNodeCandidate = fragment.querySelector(
        "[data-menu-card-label]",
      );
      const labelNode =
        labelNodeCandidate instanceof HTMLElement ? labelNodeCandidate : null;

      if (!(frontFace instanceof HTMLElement)) {
        console.error(
          `${LOG_PREFIX} Template is missing .menu-card__face--front.`,
          frontFaceCandidate,
        );
        return;
      }

      if (!(labelNode instanceof HTMLElement)) {
        console.error(
          `${LOG_PREFIX} Template is missing [data-menu-card-label].`,
          labelNodeCandidate,
        );
        return;
      }

      if (!(icon instanceof SVGElement)) {
        console.error(
          `${LOG_PREFIX} Card is missing an icon: use data-menu-icon or a child <svg>.`,
          this,
        );
      } else {
        const iconClone = icon.cloneNode(true);
        if (iconClone instanceof SVGElement) {
          iconClone.setAttribute("aria-hidden", "true");
        }
        frontFace.prepend(iconClone);
      }

      labelNode.textContent = label;
      this.append(fragment);
      this.dataset.hydrated = "true";
    }
  }

  try {
    customElements.define("menu-card", MenuCard);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to define custom element.`, error);
  }
}
