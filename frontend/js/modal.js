// modal.js — Fenêtres modales stylées (remplace prompt/alert/confirm natifs
// du navigateur, qui ne sont pas personnalisables et cassent le rendu premium).

function buildOverlay(innerHtml) {
  const overlay = document.createElement("div");
  overlay.className = "nc-modal-overlay";
  overlay.innerHTML = `<div class="nc-modal-card">${innerHtml}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function closeOverlay(overlay) {
  overlay.remove();
}

// Boîte d'information simple (remplace alert()).
export function notify(message, title = "") {
  return new Promise(resolve => {
    const overlay = buildOverlay(`
      ${title ? `<h3 class="nc-modal-title">${title}</h3>` : ""}
      <p class="nc-modal-text">${message}</p>
      <button class="nc-btn-primary nc-btn-inline" id="nc-modal-ok">OK</button>
    `);
    overlay.querySelector("#nc-modal-ok").onclick = () => {
      closeOverlay(overlay);
      resolve();
    };
  });
}

// Boîte de confirmation (remplace confirm()).
export function confirmDialog(message, { confirmLabel = "Confirmer", cancelLabel = "Annuler" } = {}) {
  return new Promise(resolve => {
    const overlay = buildOverlay(`
      <p class="nc-modal-text">${message}</p>
      <div class="nc-modal-actions">
        <button class="nc-btn-secondary nc-btn-half" id="nc-modal-cancel">${cancelLabel}</button>
        <button class="nc-btn-primary nc-btn-half" id="nc-modal-confirm">${confirmLabel}</button>
      </div>
    `);
    overlay.querySelector("#nc-modal-cancel").onclick = () => { closeOverlay(overlay); resolve(false); };
    overlay.querySelector("#nc-modal-confirm").onclick = () => { closeOverlay(overlay); resolve(true); };
  });
}

// Boîte de saisie texte (remplace prompt()).
export function promptDialog(title, { placeholder = "", defaultValue = "", multiline = false, confirmLabel = "Valider" } = {}) {
  return new Promise(resolve => {
    const fieldHtml = multiline
      ? `<textarea id="nc-modal-input" class="nc-bio-textarea" placeholder="${placeholder}">${defaultValue}</textarea>`
      : `<input id="nc-modal-input" type="text" class="nc-search-input" placeholder="${placeholder}" value="${defaultValue}" />`;
    const overlay = buildOverlay(`
      <h3 class="nc-modal-title">${title}</h3>
      ${fieldHtml}
      <div class="nc-modal-actions">
        <button class="nc-btn-secondary nc-btn-half" id="nc-modal-cancel">Annuler</button>
        <button class="nc-btn-primary nc-btn-half" id="nc-modal-confirm">${confirmLabel}</button>
      </div>
    `);
    const input = overlay.querySelector("#nc-modal-input");
    input.focus();
    overlay.querySelector("#nc-modal-cancel").onclick = () => { closeOverlay(overlay); resolve(null); };
    overlay.querySelector("#nc-modal-confirm").onclick = () => {
      const value = input.value.trim();
      closeOverlay(overlay);
      resolve(value || null);
    };
  });
}

// Liste à choix unique (remplace prompt() avec une liste numérotée).
// items = [{ id, label, sublabel, avatarHtml }]
export function pickerDialog(title, items, { emptyMessage = "Rien à afficher." } = {}) {
  return new Promise(resolve => {
    const rowsHtml = items.length
      ? items.map(item => `
          <div class="nc-picker-row" data-id="${item.id}">
            ${item.avatarHtml ? `<div class="nc-avatar-small">${item.avatarHtml}</div>` : ""}
            <div>
              <div class="nc-picker-label">${item.label}</div>
              ${item.sublabel ? `<div class="nc-picker-sublabel">${item.sublabel}</div>` : ""}
            </div>
          </div>
        `).join("")
      : `<p class="nc-placeholder">${emptyMessage}</p>`;

    const overlay = buildOverlay(`
      <h3 class="nc-modal-title">${title}</h3>
      <div class="nc-picker-list">${rowsHtml}</div>
      <button class="nc-btn-secondary nc-btn-inline" id="nc-modal-cancel">Annuler</button>
    `);
    overlay.querySelector("#nc-modal-cancel").onclick = () => { closeOverlay(overlay); resolve(null); };
    overlay.querySelectorAll(".nc-picker-row").forEach(row => {
      row.onclick = () => { closeOverlay(overlay); resolve(row.dataset.id); };
    });
  });
}
