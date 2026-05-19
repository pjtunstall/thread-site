import { CONTACT_FORM_LIMITS, getTurnstileSitekey } from "../shared/config.js";
import { trustedScriptURL } from "../trusted-types-boot.js";
import { TURNSTILE_API_URL } from "../trusted-types.js";

const LOG_PREFIX = "[site-init]";

let turnstileScriptPromise = null;

/**
 * @returns {boolean}
 */
function turnstileApiReady() {
  return Boolean(
    window.turnstile && typeof window.turnstile.render === "function",
  );
}

/**
 * @returns {Promise<void>}
 */
function ensureTurnstileScript() {
  if (turnstileApiReady()) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }
  const existing = document.querySelector("script[data-thread-turnstile-api]");
  if (existing) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const finishErr = () => {
        console.error(`${LOG_PREFIX} Turnstile API script failed to load.`);
        existing.remove();
        turnstileScriptPromise = null;
        reject(new Error("Turnstile script failed"));
      };
      const tryResolve = () => {
        if (turnstileApiReady()) {
          resolve();
          return true;
        }
        return false;
      };
      if (tryResolve()) return;
      existing.addEventListener(
        "load",
        () => {
          resolve();
        },
        { once: true },
      );
      existing.addEventListener("error", finishErr, { once: true });
      queueMicrotask(() => {
        if (tryResolve()) return;
      });
    });
    return turnstileScriptPromise;
  }
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = trustedScriptURL(TURNSTILE_API_URL);
    script.async = true;
    script.setAttribute("data-thread-turnstile-api", "");
    script.addEventListener(
      "load",
      () => {
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        console.error(`${LOG_PREFIX} Turnstile API script failed to load.`);
        script.remove();
        turnstileScriptPromise = null;
        reject(new Error("Turnstile script failed"));
      },
      { once: true },
    );
    document.head.append(script);
  });
  return turnstileScriptPromise;
}

/**
 * @param {HTMLFormElement} form
 * @param {{ type?: string, name: string, label: string, required?: boolean, rows?: number, minlength?: number, maxlength?: number, autocomplete?: string }} field
 */
function renderFormField(form, field) {
  const wrapper = document.createElement("label");
  wrapper.className = "contact-form__field";

  const labelRow = document.createElement("span");
  labelRow.className = "contact-form__label-row";

  const labelText = document.createElement("span");
  labelText.className = "contact-form__label";
  labelText.textContent = field.label;
  labelRow.append(labelText);

  if (field.required) {
    const requiredMark = document.createElement("span");
    requiredMark.className = "contact-form__label-required-mark";
    requiredMark.setAttribute("aria-hidden", "true");
    requiredMark.textContent = " *";
    labelRow.append(requiredMark);
  }

  wrapper.append(labelRow);

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

/**
 * @param {HTMLFormElement} form
 */
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

/**
 * @param {HTMLElement} statusEl
 * @param {string | null} kind
 * @param {string} message
 */
function setStatus(statusEl, kind, message) {
  statusEl.textContent = message;
  statusEl.classList.remove(
    "contact-form__status--error",
    "contact-form__status--success",
    "contact-form__status--pending",
  );
  if (kind) statusEl.classList.add(`contact-form__status--${kind}`);
}

// The Turnstile API script is injected on first contact dialog open
// (ensureTurnstileScript). After it runs, we poll until render() exists instead
// of using turnstile.ready(), so we do not depend on Turnstile's ready helper
// and load-order quirks. Dynamically appended scripts are async by default; we
// set script.async explicitly for clarity.
/**
 * @param {() => void} callback
 */
function whenTurnstileLoaded(callback) {
  ensureTurnstileScript()
    .then(() => {
      if (turnstileApiReady()) {
        callback();
        return;
      }
      let attempts = 0;
      const tick = () => {
        if (turnstileApiReady()) {
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
    })
    .catch(() => {
      // ensureTurnstileScript already logged a script network/load failure.
    });
}

/**
 * @param {HTMLElement} container
 * @param {(token: string | null) => void} onToken
 * @returns {{ reset: () => void }}
 */
function mountTurnstile(container, onToken) {
  const handle = { widgetId: null };
  whenTurnstileLoaded(() => {
    handle.widgetId = window.turnstile.render(container, {
      sitekey: getTurnstileSitekey(),
      callback: onToken,
      "error-callback": () => {
        onToken(null);
      },
      "expired-callback": () => {
        onToken(null);
      },
    });
  });

  return {
    reset: () => {
      if (handle.widgetId !== null && window.turnstile) {
        window.turnstile.reset(handle.widgetId);
      }
    },
  };
}

/**
 * @param {HTMLElement} bodyContainer
 * @param {{ id?: string, endpoint: string, submitLabel?: string, fields: Array<unknown> }} formDef
 */
export function renderForm(bodyContainer, formDef) {
  const form = document.createElement("form");
  form.className = "contact-form";
  form.id = formDef.id || "contact-form";
  form.noValidate = true;

  formDef.fields.forEach((field) => {
    renderFormField(form, field);
  });

  renderHoneypot(form);

  const statusEl = document.createElement("p");
  statusEl.className = "contact-form__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");
  form.append(statusEl);

  // Bottom row: Turnstile on the left, action buttons on the right.
  const actions = document.createElement("div");
  actions.className = "contact-form__actions";

  const turnstileMount = document.createElement("div");
  turnstileMount.className = "contact-form__turnstile";
  actions.append(turnstileMount);

  const buttons = document.createElement("div");
  buttons.className = "contact-form__buttons";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "contact-form__submit";
  const submitLabel = document.createElement("span");
  submitLabel.className = "btn__label";
  submitLabel.textContent = formDef.submitLabel || "Send";
  submit.append(submitLabel);
  buttons.append(submit);

  // If this form lives inside a dialog (which it does!), take ownership of the
  // dialog's Close button so it ends up on the same row as Send. The
  // template-supplied footer is removed to avoid a duplicate.
  const owningDialog = bodyContainer.closest("dialog");
  if (owningDialog) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "dialog__close contact-form__close";
    close.setAttribute("data-dialog-close", "");
    const closeLabel = document.createElement("span");
    closeLabel.className = "btn__label";
    closeLabel.textContent = "CLOSE";
    close.append(closeLabel);
    buttons.append(close);

    const existingFooter = owningDialog.querySelector(".dialog__footer");
    if (existingFooter) existingFooter.remove();
  }

  actions.append(buttons);
  form.append(actions);

  bodyContainer.append(form);

  let turnstileToken = null;
  let widget = null;

  // Turnstile won't initialize inside display:none ancestors, so the widget is
  // mounted when the dialog first opens. The Turnstile API script is also
  // loaded then (first call here), not on initial page load.
  form._mountTurnstileIfNeeded = () => {
    if (widget) return;
    widget = mountTurnstile(turnstileMount, (token) => {
      turnstileToken = token;
    });
  };

  form.addEventListener("submit", async (event) => {
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
      setStatus(statusEl, "error", "Email and message are both required.");
      return;
    }
    if (data.message.length < CONTACT_FORM_LIMITS.messageMin) {
      setStatus(
        statusEl,
        "error",
        `Message is too short (min ${CONTACT_FORM_LIMITS.messageMin} characters).`,
      );
      return;
    }
    if (data.message.length > CONTACT_FORM_LIMITS.messageMax) {
      setStatus(
        statusEl,
        "error",
        `Message is too long (max ${CONTACT_FORM_LIMITS.messageMax} characters).`,
      );
      return;
    }
    if (data.name.length > CONTACT_FORM_LIMITS.nameMax) {
      setStatus(
        statusEl,
        "error",
        `Name is too long (max ${CONTACT_FORM_LIMITS.nameMax} characters).`,
      );
      return;
    }
    if (data.subject.length > CONTACT_FORM_LIMITS.subjectMax) {
      setStatus(
        statusEl,
        "error",
        `Subject is too long (max ${CONTACT_FORM_LIMITS.subjectMax} characters).`,
      );
      return;
    }
    if (data.email.length > CONTACT_FORM_LIMITS.emailMax) {
      setStatus(
        statusEl,
        "error",
        `Email is too long (max ${CONTACT_FORM_LIMITS.emailMax} characters).`,
      );
      return;
    }
    if (!turnstileToken) {
      setStatus(
        statusEl,
        "error",
        "Verification didn't complete. Please wait a moment and try again, or reload the page.",
      );
      return;
    }

    submit.disabled = true;
    setStatus(statusEl, "pending", "Sending...");

    try {
      const response = await fetch(formDef.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let json = {};
      try {
        json = await response.json();
      } catch {
        // Response body was not JSON; json remains {}.
      }

      if (response.ok) {
        form.reset();
        if (widget) widget.reset();
        turnstileToken = null;
        setStatus(statusEl, "success", "Thanks! Your message is on its way.");
      } else {
        const code = json?.error;
        let message;
        switch (code) {
          case "rate_limited":
            message =
              "You've sent a couple of messages just a moment ago. Please wait a minute and try again.";
            break;
          case "turnstile_failed":
            message = "Verification failed. Please try the challenge again.";
            break;
          case "invalid":
            message = "Invalid input. Please check the form and try again.";
            break;
          case "payload_too_large":
            message =
              "That submission is too large for the server (for example a very long message with many special characters). Please shorten it and try again.";
            break;
          default:
            message = "Something went wrong. Please try again.";
        }
        setStatus(statusEl, "error", message);
        if (widget) widget.reset();
        turnstileToken = null;
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Contact form network error.`, err);
      setStatus(
        statusEl,
        "error",
        "Could not reach the server. Please try again.",
      );
      if (widget) widget.reset();
      turnstileToken = null;
    } finally {
      submit.disabled = false;
    }
  });
}
