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

export const dialogTriggers = document.querySelectorAll("[data-open-dialog]");
export const dialogs = document.querySelectorAll("dialog[data-dialog]");

if (dialogTriggers.length === 0) {
  console.error(
    `${LOG_PREFIX} No [data-open-dialog] triggers found; dialogs cannot be opened.`,
  );
}

if (dialogs.length === 0) {
  console.error(`${LOG_PREFIX} No dialog[data-dialog] elements found.`);
}

export function getDialogTargetForTrigger(trigger) {
  const id = trigger.getAttribute("data-open-dialog");
  const dialog = id ? document.getElementById(id) : null;
  if (!dialog || !(dialog instanceof HTMLDialogElement)) {
    console.error(`${LOG_PREFIX} Trigger references a missing or non-dialog target.`, {
      trigger,
      targetId: id,
      target: dialog,
    });
    return null;
  }
  return dialog;
}
