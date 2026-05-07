const LOG_PREFIX = "[site-init]";

export function requireElement(candidate, selector, expectedType) {
  if (candidate instanceof expectedType) return candidate;
  console.error(
    `${LOG_PREFIX} Required element ${selector} is missing or has the wrong type.`,
    candidate,
  );
  throw new Error(`${LOG_PREFIX} Missing required element: ${selector}`);
}

export const themeToggle = requireElement(
  document.querySelector("[data-theme-toggle]"),
  "[data-theme-toggle]",
  HTMLButtonElement,
);

export const menuToggle = requireElement(
  document.querySelector("[data-menu-toggle]"),
  "[data-menu-toggle]",
  HTMLButtonElement,
);

export const menu = requireElement(
  document.querySelector("[data-menu]"),
  "[data-menu]",
  HTMLElement,
);
