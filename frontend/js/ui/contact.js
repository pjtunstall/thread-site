import { getTurnstileSitekey } from "../shared/config.js";

const LOG_PREFIX = "[site-init]";

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

export function renderForm(bodyContainer, formDef) {
  const form = document.createElement("form");
  form.className = "contact-form";
  form.id = formDef.id || "contact-form";
  form.noValidate = true;

  formDef.fields.forEach(function (field) {
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

  // If this form lives inside a dialog, take ownership of the dialog's Close
  // button so it ends up on the same row as Send. The template-supplied
  // footer is removed to avoid a duplicate.
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
      setStatus(statusEl, "error", "Email and message are both required.");
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
        "Verification didn't complete. Please wait a moment and try again, or reload the page.",
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
          setStatus(statusEl, "success", "Thanks! Your message is on its way.");
        } else {
          const code = result.json && result.json.error;
          let message = "Something went wrong. Please try again.";
          if (code === "rate_limited") {
            message =
              "You've sent a couple of messages already. Please wait a minute and try again.";
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
