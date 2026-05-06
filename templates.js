export const MENU_CARD_TEMPLATE_HTML = `
  <span class="menu-card__face menu-card__face--back" aria-hidden="true"></span>
  <span class="menu-card__face menu-card__face--front">
    <span class="btn__label" data-menu-card-label></span>
  </span>
`;

export const DIALOG_TEMPLATE_HTML = `
  <dialog data-dialog>
    <div class="dialog__panel">
      <div class="dialog__inner">
        <h2 class="dialog__title" data-dialog-title></h2>
        <div data-dialog-body></div>
        <div class="dialog__footer">
          <button type="button" class="dialog__close" data-dialog-close>
            <span class="btn__label">Close</span>
          </button>
        </div>
      </div>
    </div>
  </dialog>
`;
