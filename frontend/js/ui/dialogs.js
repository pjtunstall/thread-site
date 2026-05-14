import { CONTACT_ENDPOINT, CONTACT_FORM_LIMITS } from "../shared/config.js";
import { DIALOG_TEMPLATE_HTML } from "../shared/templates.js";
import { renderForm } from "./contact.js";

const LOG_PREFIX = "[site-init]";

export const MAIN_MENU_DIALOGS = [
  {
    id: "dlg-story",
    title: "STORY",
    body: [
      {
        type: "paragraph",
        text: "Every nine years, King Minos demands a terrible tribute, turning friend against friend. Only one can go free. But don't wait too long--you're never alone in a labyrinth.",
      },
    ],
  },
  {
    id: "dlg-about",
    title: "ABOUT",
    body: [
      {
        type: "paragraph",
        text: "By a Thread is a battle-royale first-person shooter for up to ten players. It's available as a desktop app for Windows, macOS, and Linux. You'll need internet access to play.",
      },
      {
        type: "paragraph",
        parts: [
          "I made it as coursework at a coding bootcamp. You can read more on ",
          {
            type: "link",
            href: "https://github.com/pjtunstall/by-a-thread",
            text: "GitHub",
          },
          ".",
        ],
      },
      {
        type: "paragraph",
        text: "It's mainly intended as a multiplayer game. The only server is in Germany, so there might be too much lag if you're outside Europe. Maybe one day, I'll add AI opponents, but, for now, if you're a single player, just try to escape the maze in time.",
      },
    ],
  },
  {
    id: "dlg-instructions",
    title: "INSTRUCTIONS",
    body: [
      {
        type: "paragraph",
        text: "Launch the app and press ENTER. One player picks Create Game and shares the access code. The others choose Join Game.",
      },
      {
        type: "paragraph",
        text: "The first person to enter their name and join the chat lobby is the host. They start the game when everyone is ready.",
      },
      {
        type: "paragraph",
        text: "W, A, S, D keys to glide, ARROW keys to turn, SPACE to fire. At any time, you can press ESCAPE to exit.",
      },
    ],
  },
  {
    id: "dlg-contact",
    title: "CONTACT",
    body: [
      {
        type: "paragraph",
        text: "Bug reports, questions, offers of marriage/string? Drop me a line.",
      },
      {
        type: "form",
        id: "contact-form",
        endpoint: CONTACT_ENDPOINT,
        submitLabel: "SEND",
        fields: [
          {
            type: "text",
            name: "name",
            label: "Name",
            autocomplete: "name",
            maxlength: CONTACT_FORM_LIMITS.nameMax,
          },
          {
            type: "email",
            name: "email",
            label: "Email",
            autocomplete: "email",
            required: true,
            maxlength: CONTACT_FORM_LIMITS.emailMax,
          },
          {
            type: "text",
            name: "subject",
            label: "Subject",
            maxlength: CONTACT_FORM_LIMITS.subjectMax,
          },
          {
            type: "textarea",
            name: "message",
            label: "Message",
            required: true,
            rows: 6,
            minlength: CONTACT_FORM_LIMITS.messageMin,
            maxlength: CONTACT_FORM_LIMITS.messageMax,
          },
        ],
      },
    ],
  },
];

function getDialogTargetForTrigger(trigger) {
  const id = trigger.getAttribute("data-open-dialog");
  const dialog = id ? document.getElementById(id) : null;
  if (!dialog || !(dialog instanceof HTMLDialogElement)) {
    console.error(
      `${LOG_PREFIX} Trigger references a missing or non-dialog target.`,
      {
        trigger,
        targetId: id,
        target: dialog,
      },
    );
    return null;
  }
  return dialog;
}

function getDialogTemplate() {
  let template = document.getElementById("dialog-template");
  if (!(template instanceof HTMLTemplateElement)) {
    const created = document.createElement("template");
    created.id = "dialog-template";
    created.innerHTML = DIALOG_TEMPLATE_HTML;
    document.body.append(created);
    template = created;
  }
  return template;
}

function appendPart(parent, part) {
  if (typeof part === "string") {
    parent.append(document.createTextNode(part));
    return;
  }

  if (part.type === "code") {
    const code = document.createElement("code");
    code.textContent = part.text;
    parent.append(code);
    return;
  }

  if (part.type === "link") {
    const link = document.createElement("a");
    link.className = "dialog__link";
    link.href = part.href;
    link.textContent = part.text;
    parent.append(link);
    return;
  }

  if (part.type === "strong") {
    const strong = document.createElement("strong");
    strong.className = "dialog__strong";
    strong.textContent = part.text;
    parent.append(strong);
    return;
  }
}

function renderParagraph(bodyContainer, paragraph) {
  const p = document.createElement("p");
  p.className = "dialog__body";

  if (paragraph.text) {
    p.textContent = paragraph.text;
  } else if (paragraph.parts) {
    paragraph.parts.forEach(function (part) {
      appendPart(p, part);
    });
  }

  bodyContainer.append(p);
}

function renderDialogs(dialogDefs) {
  const template = getDialogTemplate();
  if (!template) return;

  dialogDefs.forEach(function (dialogDef) {
    const existing = document.getElementById(dialogDef.id);
    if (existing) existing.remove();

    const fragment = template.content.cloneNode(true);
    const dialog = fragment.querySelector("dialog[data-dialog]");
    const title = fragment.querySelector("[data-dialog-title]");
    const body = fragment.querySelector("[data-dialog-body]");

    if (
      !(dialog instanceof HTMLDialogElement) ||
      !(title instanceof HTMLElement) ||
      !(body instanceof HTMLElement)
    ) {
      console.error(`${LOG_PREFIX} Dialog template has unexpected structure.`);
      return;
    }

    const titleId = `${dialogDef.id}-title`;
    dialog.id = dialogDef.id;
    dialog.setAttribute("aria-labelledby", titleId);
    title.id = titleId;
    title.textContent = dialogDef.title;

    if (dialogDef.noBackdropClose === true) {
      dialog.setAttribute("data-dialog-no-backdrop-close", "");
    }

    dialogDef.body.forEach(function (entry, idx) {
      if (idx > 0) body.append(document.createElement("br"));
      if (entry.type === "form") {
        renderForm(body, entry);
      } else {
        renderParagraph(body, entry);
      }
    });

    document.body.append(fragment);
  });
}

export function initDialogs(options) {
  const config = options || {};
  const dialogDefs = Array.isArray(config.dialogs)
    ? config.dialogs
    : MAIN_MENU_DIALOGS;
  // When true (i.e. for the post-download installation guides), none of the
  // dialogs in this batch are closable via a backdrop click.
  const blockBackdropCloseAll = config.noBackdropClose === true;
  renderDialogs(dialogDefs);

  const dialogTriggers = document.querySelectorAll("[data-open-dialog]");
  const dialogs = document.querySelectorAll("dialog[data-dialog]");

  dialogTriggers.forEach(function (btn) {
    const dialog = getDialogTargetForTrigger(btn);
    if (!dialog) return;

    btn.addEventListener("click", function () {
      dialog.showModal();
      const form = dialog.querySelector("form");
      // Contact form: load Turnstile API (once) and mount the widget on first
      // open.
      if (form && typeof form._mountTurnstileIfNeeded === "function") {
        form._mountTurnstileIfNeeded();
      }
    });
  });

  // Backdrop-click-to-close is convenient for prose dialogs but undesirable in
  // some cases: the contact form and the installation guides. We don't want the
  // user to lose partially-typed input from the form, or have to repeat a
  // download just to get back to the installation guide. ESC and the explicit
  // Close button still work in every case.
  dialogs.forEach(function (dialog) {
    const allowBackdropClose =
      !blockBackdropCloseAll &&
      !dialog.hasAttribute("data-dialog-no-backdrop-close") &&
      !dialog.querySelector("form");

    if (allowBackdropClose) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
    }

    dialog.querySelectorAll("[data-dialog-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        dialog.close();
      });
    });
  });
}
