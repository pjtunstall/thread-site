export function defineMenuCard() {
  if (customElements.get("menu-card")) {
    return; // Already defined.
  }

  const LOG_PREFIX = "[menu-card]";
  const templateCandidate = document.querySelector("#menu-card-template");

  if (!(templateCandidate instanceof HTMLTemplateElement)) {
    console.error(
      `${LOG_PREFIX} Missing or invalid #menu-card-template; expected an HTMLTemplateElement.`,
      templateCandidate,
    );
    return;
  }

  const menuCardTemplate = templateCandidate;

  class MenuCard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.hydrated === "true") return;

      const label = this.getAttribute("label") || "";
      const icon = this.querySelector("svg");

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
        console.error(`${LOG_PREFIX} Card is missing child <svg> icon.`, this);
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
