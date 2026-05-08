import { DIALOG_TEMPLATE_HTML } from "./templates.js";
import { getTurnstileSitekey, getContactEndpoint } from "./config.js";

const LOG_PREFIX = "[site-init]";

const DEFAULT_DIALOGS = [
  {
    id: "dlg-story",
    title: "Story",
    body: [
      {
        type: "paragraph",
        text: "Every nine years, King Minos demands a terrible tribute, turning friend against friend. Only one can go free. But don't wait too long--you're never alone in a labyrinth.",
      },
    ],
  },
  {
    id: "dlg-about",
    title: "About",
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
        text: "It's really a multiplayer game. The server is hosted in Germany, so the lag might be unacceptable if you're outside Europe. Maybe one day, I'll add AI opponents. For now, as a single player, just try to escape the maze in time.",
      },
    ],
  },
  {
    id: "dlg-instructions",
    title: "Instructions",
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
    title: "Contact",
    body: [
      {
        type: "paragraph",
        text: "Spotted a bug, want to say hello, or have a question? Drop me a line.",
      },
      {
        type: "form",
        id: "contact-form",
        endpoint: getContactEndpoint,
        submitLabel: "Send",
        fields: [
          {
            type: "text",
            name: "name",
            label: "Name",
            autocomplete: "name",
            maxlength: 100,
          },
          {
            type: "email",
            name: "email",
            label: "Email",
            autocomplete: "email",
            required: true,
            maxlength: 254,
          },
          {
            type: "text",
            name: "subject",
            label: "Subject",
            maxlength: 200,
          },
          {
            type: "textarea",
            name: "message",
            label: "Message",
            required: true,
            rows: 6,
            minlength: 10,
            maxlength: 4000,
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

function renderFormField(form, field) {
  const wrapper = document.createElement("label");
  wrapper.className = "contact-form__field";

  const labelText = document.createElement("span");
  labelText.className = "contact-form__label";
  labelText.textContent = field.required ? `${field.label} *` : field.label;
  wrapper.append(labelText);

  let control;
  if (field.type === "textarea") {
    control = document.createElement("textarea");
    if (field.rows) control.rows = field.rows;
  } else {
    control = document.createElement("input");
    control.type = field.type || "text";
  }

  control.name = field.name;
  control.className = "contact-form__control";
  if (field.required) control.required = true;
  if (field.minlength) control.minLength = field.minlength;
  if (field.maxlength) control.maxLength = field.maxlength;
  if (field.autocomplete) control.autocomplete = field.autocomplete;

  wrapper.append(control);
  form.append(wrapper);
}

function renderHoneypot(form) {
  // Honeypot: hidden from real users, irresistible to naive bots.
  const wrapper = document.createElement("div");
  wrapper.className = "contact-form__honeypot";
  wrapper.setAttribute("aria-hidden", "true");

  const label = document.createElement("label");
  label.textContent = "Website (leave blank)";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "website";
  input.tabIndex = -1;
  input.autocomplete = "off";

  label.append(input);
  wrapper.append(label);
  form.append(wrapper);
}

function setStatus(statusEl, kind, message) {
  statusEl.textContent = message;
  statusEl.classList.remove(
    "contact-form__status--error",
    "contact-form__status--success",
    "contact-form__status--pending",
  );
  if (kind) statusEl.classList.add(`contact-form__status--${kind}`);
}

// Wait for the Turnstile script to expose its render() function. We poll
// rather than calling turnstile.ready() because the latter is incompatible
// with the async/defer attributes on our <script> tag (Turnstile throws if
// you mix them).
function whenTurnstileLoaded(callback) {
  if (window.turnstile && typeof window.turnstile.render === "function") {
    callback();
    return;
  }
  let attempts = 0;
  const tick = function () {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      callback();
      return;
    }
    attempts += 1;
    if (attempts > 100) {
      console.error(`${LOG_PREFIX} Turnstile failed to load.`);
      return;
    }
    setTimeout(tick, 100);
  };
  tick();
}

function mountTurnstile(container, onToken) {
  const handle = { widgetId: null };
  whenTurnstileLoaded(function () {
    handle.widgetId = window.turnstile.render(container, {
      sitekey: getTurnstileSitekey(),
      callback: onToken,
      "error-callback": function () {
        onToken(null);
      },
      "expired-callback": function () {
        onToken(null);
      },
    });
  });

  return {
    reset: function () {
      if (handle.widgetId !== null && window.turnstile) {
        window.turnstile.reset(handle.widgetId);
      }
    },
  };
}

function renderForm(bodyContainer, formDef) {
  const form = document.createElement("form");
  form.className = "contact-form";
  form.id = formDef.id || "contact-form";
  form.noValidate = true;

  formDef.fields.forEach(function (field) {
    renderFormField(form, field);
  });

  renderHoneypot(form);

  const turnstileMount = document.createElement("div");
  turnstileMount.className = "contact-form__turnstile";
  form.append(turnstileMount);

  const statusEl = document.createElement("p");
  statusEl.className = "contact-form__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");
  form.append(statusEl);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "contact-form__submit";
  const submitLabel = document.createElement("span");
  submitLabel.className = "btn__label";
  submitLabel.textContent = formDef.submitLabel || "Send";
  submit.append(submitLabel);
  form.append(submit);

  bodyContainer.append(form);

  let turnstileToken = null;
  let widget = null;

  // Turnstile refuses to initialise inside display:none ancestors. Forms
  // rendered inside a closed <dialog> defer their widget mount until the
  // dialog first opens (initDialogs calls _mountTurnstileIfNeeded then).
  // Forms outside a dialog mount immediately.
  form._mountTurnstileIfNeeded = function () {
    if (widget) return;
    widget = mountTurnstile(turnstileMount, function (token) {
      turnstileToken = token;
    });
  };

  if (!form.closest("dialog")) {
    form._mountTurnstileIfNeeded();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const data = {
      name: form.elements.namedItem("name")?.value.trim() || "",
      email: form.elements.namedItem("email")?.value.trim() || "",
      subject: form.elements.namedItem("subject")?.value.trim() || "",
      message: form.elements.namedItem("message")?.value.trim() || "",
      website: form.elements.namedItem("website")?.value || "",
      "cf-turnstile-response": turnstileToken || "",
    };

    if (!data.email || !data.message) {
      setStatus(
        statusEl,
        "error",
        "Email and message are both required.",
      );
      return;
    }
    if (data.message.length < 10) {
      setStatus(
        statusEl,
        "error",
        "Please write at least a sentence (10+ characters).",
      );
      return;
    }
    if (!turnstileToken) {
      setStatus(
        statusEl,
        "error",
        "Please complete the verification challenge.",
      );
      return;
    }

    submit.disabled = true;
    setStatus(statusEl, "pending", "Sending...");

    const endpoint =
      typeof formDef.endpoint === "function"
        ? formDef.endpoint()
        : formDef.endpoint;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (json) {
            return { ok: response.ok, status: response.status, json };
          });
      })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          if (widget) widget.reset();
          turnstileToken = null;
          setStatus(
            statusEl,
            "success",
            "Thanks! Your message is on its way.",
          );
        } else {
          const code = result.json && result.json.error;
          let message = "Something went wrong. Please try again.";
          if (code === "rate_limited") {
            message = "Too many messages from this address. Try again later.";
          } else if (code === "turnstile_failed") {
            message = "Verification failed. Please try the challenge again.";
          } else if (code === "invalid") {
            message = "Please check the form and try again.";
          }
          setStatus(statusEl, "error", message);
          if (widget) widget.reset();
          turnstileToken = null;
        }
      })
      .catch(function (err) {
        console.error(`${LOG_PREFIX} Contact form network error.`, err);
        setStatus(
          statusEl,
          "error",
          "Could not reach the server. Please try again.",
        );
        if (widget) widget.reset();
        turnstileToken = null;
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
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
    : DEFAULT_DIALOGS;
  renderDialogs(dialogDefs);

  const dialogTriggers = document.querySelectorAll("[data-open-dialog]");
  const dialogs = document.querySelectorAll("dialog[data-dialog]");

  dialogTriggers.forEach(function (btn) {
    const dialog = getDialogTargetForTrigger(btn);
    if (!dialog) return;

    btn.addEventListener("click", function () {
      dialog.showModal();
      // Mount any deferred form widgets now that the dialog is visible.
      dialog.querySelectorAll("form").forEach(function (form) {
        if (typeof form._mountTurnstileIfNeeded === "function") {
          form._mountTurnstileIfNeeded();
        }
      });
    });
  });

  dialogs.forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-dialog-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        dialog.close();
      });
    });
  });
}
