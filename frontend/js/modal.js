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

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(2) + " Mo";
}

// Modale premium d'upload de photo : aperçu circulaire, anneau de
// progression pendant l'envoi, infos du fichier sélectionné.
// uploadFn(file, onProgress) doit renvoyer une Promise<{ url }>.
// Renvoie l'URL obtenue, ou null si l'utilisateur annule.
export function openPhotoUploadDialog(currentAvatarHtml, uploadFn) {
  return new Promise(resolve => {
    const overlay = buildOverlay(`
      <h3 class="nc-modal-title">Modifier la photo de profil</h3>
      <p class="nc-modal-text">Choisis une photo qui te représente.</p>

      <div class="nc-upload-preview-wrap">
        <div class="nc-upload-ring" id="nc-upload-ring">
          <div class="nc-upload-avatar" id="nc-upload-avatar">${currentAvatarHtml}</div>
        </div>
        <div class="nc-upload-percent" id="nc-upload-percent" hidden>0%</div>
      </div>

      <div class="nc-upload-file-row" id="nc-upload-file-row" hidden></div>

      <input type="file" id="nc-upload-input" accept="image/*" hidden />
      <div class="nc-modal-actions">
        <button class="nc-btn-secondary nc-btn-half" id="nc-upload-cancel">Annuler</button>
        <button class="nc-btn-primary nc-btn-half" id="nc-upload-select">Choisir une image</button>
      </div>
    `);

    const fileInput = overlay.querySelector("#nc-upload-input");
    const selectBtn = overlay.querySelector("#nc-upload-select");
    const cancelBtn = overlay.querySelector("#nc-upload-cancel");
    const ring = overlay.querySelector("#nc-upload-ring");
    const avatarEl = overlay.querySelector("#nc-upload-avatar");
    const percentEl = overlay.querySelector("#nc-upload-percent");
    const fileRow = overlay.querySelector("#nc-upload-file-row");

    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      closeOverlay(overlay);
      resolve(result);
    }

    cancelBtn.onclick = () => close(null);
    selectBtn.onclick = () => fileInput.click();

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;

      avatarEl.innerHTML = `<img src="${URL.createObjectURL(file)}" class="nc-avatar-img" />`;
      fileRow.hidden = false;
      fileRow.innerHTML = `
        <span class="nc-upload-file-name">${file.name}</span>
        <span class="nc-upload-file-size">${formatFileSize(file.size)}</span>
      `;
      selectBtn.disabled = true;
      selectBtn.textContent = "Envoi en cours...";
      cancelBtn.disabled = true;
      percentEl.hidden = false;

      try {
        const result = await uploadFn(file, pct => {
          percentEl.textContent = pct + "%";
          ring.style.background = `conic-gradient(var(--nc-orange) ${pct}%, var(--nc-border) ${pct}%)`;
        });
        close(result.url);
      } catch (err) {
        percentEl.hidden = true;
        selectBtn.disabled = false;
        cancelBtn.disabled = false;
        selectBtn.textContent = "Réessayer";
        fileRow.innerHTML += `<span class="nc-upload-error">${err.message}</span>`;
      }
    };
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
