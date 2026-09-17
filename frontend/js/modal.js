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
const CROP_VIEWPORT = 260;
const CROP_OUTPUT = 640;

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
      <div class="nc-modal-actions" id="nc-upload-actions">
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
    const modalCard = overlay.querySelector(".nc-modal-card");

    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      closeOverlay(overlay);
      resolve(result);
    }

    cancelBtn.onclick = () => close(null);
    selectBtn.onclick = () => fileInput.click();

    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;
      openCropStep(file);
    };

    // --- Étape 1 : recadrage / zoom ---
    function openCropStep(file) {
      const img = new Image();
      img.onload = () => {
        modalCard.innerHTML = `
          <h3 class="nc-modal-title">Ajuster la photo</h3>
          <div class="nc-crop-viewport" id="nc-crop-viewport">
            <img id="nc-crop-img" class="nc-crop-img" src="${img.src}" draggable="false" />
            <div class="nc-crop-circle-guide"></div>
          </div>
          <input type="range" id="nc-crop-zoom" min="100" max="300" value="100" class="nc-crop-slider" />
          <div class="nc-modal-actions">
            <button class="nc-btn-secondary nc-btn-half" id="nc-crop-cancel">Annuler</button>
            <button class="nc-btn-primary nc-btn-half" id="nc-crop-confirm">Valider</button>
          </div>
        `;

        const viewport = modalCard.querySelector("#nc-crop-viewport");
        const cropImg = modalCard.querySelector("#nc-crop-img");
        const zoomSlider = modalCard.querySelector("#nc-crop-zoom");

        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const coverScaleBase = CROP_VIEWPORT / Math.min(naturalW, naturalH);
        let zoomFactor = 1;
        let tx = 0, ty = 0;

        function currentScale() { return coverScaleBase * zoomFactor; }

        function applyTransform() {
          const scale = currentScale();
          const displayW = naturalW * scale;
          const displayH = naturalH * scale;
          const maxOffsetX = Math.max(0, (displayW - CROP_VIEWPORT) / 2);
          const maxOffsetY = Math.max(0, (displayH - CROP_VIEWPORT) / 2);
          tx = Math.min(maxOffsetX, Math.max(-maxOffsetX, tx));
          ty = Math.min(maxOffsetY, Math.max(-maxOffsetY, ty));
          cropImg.style.width = displayW + "px";
          cropImg.style.height = displayH + "px";
          cropImg.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px)`;
        }
        applyTransform();

        zoomSlider.oninput = () => {
          zoomFactor = zoomSlider.value / 100;
          applyTransform();
        };

        let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
        viewport.onpointerdown = e => {
          dragging = true;
          startX = e.clientX; startY = e.clientY;
          startTx = tx; startTy = ty;
          viewport.setPointerCapture(e.pointerId);
        };
        viewport.onpointermove = e => {
          if (!dragging) return;
          tx = startTx + (e.clientX - startX);
          ty = startTy + (e.clientY - startY);
          applyTransform();
        };
        viewport.onpointerup = () => { dragging = false; };
        viewport.onpointercancel = () => { dragging = false; };

        modalCard.querySelector("#nc-crop-cancel").onclick = () => close(null);
        modalCard.querySelector("#nc-crop-confirm").onclick = () => {
          const scale = currentScale();
          const displayW = naturalW * scale;
          const displayH = naturalH * scale;
          const imgLeft = (CROP_VIEWPORT - displayW) / 2 + tx;
          const imgTop = (CROP_VIEWPORT - displayH) / 2 + ty;
          const srcX = -imgLeft / scale;
          const srcY = -imgTop / scale;
          const srcSize = CROP_VIEWPORT / scale;

          const canvas = document.createElement("canvas");
          canvas.width = CROP_OUTPUT;
          canvas.height = CROP_OUTPUT;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, CROP_OUTPUT, CROP_OUTPUT);
          ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_OUTPUT, CROP_OUTPUT);

          canvas.toBlob(blob => {
            const croppedFile = new File([blob], "profil.jpg", { type: "image/jpeg" });
            openUploadStep(croppedFile, file);
          }, "image/jpeg", 0.92);
        };
      };
      img.src = URL.createObjectURL(file);
    }

    // --- Étape 2 : upload avec progression ---
    function openUploadStep(file, originalFile) {
      modalCard.innerHTML = `
        <h3 class="nc-modal-title">Modifier la photo de profil</h3>
        <div class="nc-upload-preview-wrap">
          <div class="nc-upload-ring" id="nc-upload-ring-2">
            <div class="nc-upload-avatar"><img src="${URL.createObjectURL(file)}" class="nc-avatar-img" /></div>
          </div>
          <div class="nc-upload-percent" id="nc-upload-percent-2">0%</div>
        </div>
        <div class="nc-upload-file-row">
          <span class="nc-upload-file-name">${file.name}</span>
          <span class="nc-upload-file-size">${formatFileSize(file.size)}</span>
        </div>
      `;
      const ring2 = modalCard.querySelector("#nc-upload-ring-2");
      const percent2 = modalCard.querySelector("#nc-upload-percent-2");

      // La miniature (recadrée) pilote la barre de progression visible ;
      // la photo originale part en parallèle pour rester consultable en entier.
      Promise.all([
        uploadFn(file, pct => {
          percent2.textContent = pct + "%";
          ring2.style.background = `conic-gradient(var(--nc-orange) ${pct}%, var(--nc-border) ${pct}%)`;
        }),
        uploadFn(originalFile, () => {})
      ]).then(([croppedResult, originalResult]) => {
        openSuccessStep(file, croppedResult.url, originalResult.url);
      }).catch(err => {
        modalCard.innerHTML = `
          <h3 class="nc-modal-title">Échec de l'envoi</h3>
          <p class="nc-modal-text">${err.message}</p>
          <div class="nc-modal-actions">
            <button class="nc-btn-secondary nc-btn-half" id="nc-upload-fail-cancel">Annuler</button>
            <button class="nc-btn-primary nc-btn-half" id="nc-upload-fail-retry">Réessayer</button>
          </div>
        `;
        modalCard.querySelector("#nc-upload-fail-cancel").onclick = () => close(null);
        modalCard.querySelector("#nc-upload-fail-retry").onclick = () => openUploadStep(file, originalFile);
      });
    }

    // --- Étape 3 : confirmation finale ---
    function openSuccessStep(file, url, fullUrl) {
      modalCard.innerHTML = `
        <h3 class="nc-modal-title">Photo mise à jour</h3>
        <div class="nc-upload-preview-wrap">
          <div class="nc-upload-avatar nc-upload-avatar-done"><img src="${URL.createObjectURL(file)}" class="nc-avatar-img" /></div>
        </div>
        <p class="nc-modal-text" style="text-align:center;">Ta nouvelle photo de profil est en ligne.</p>
        <button class="nc-btn-primary nc-btn-inline" id="nc-upload-ok">OK</button>
      `;
      modalCard.querySelector("#nc-upload-ok").onclick = () => close({ url, fullUrl });
    }
  });
}

// Modale d'édition du profil (nom, prénom, numéro, bio) — indépendante de la
// photo. Renvoie les nouvelles valeurs si l'utilisateur confirme, sinon null.
export function editProfileDialog(current = {}) {
  return new Promise(resolve => {
    const overlay = buildOverlay(`
      <h3 class="nc-modal-title">Modifier mon profil</h3>
      <div class="nc-edit-profile-row">
        <input id="ep-first" type="text" class="nc-search-input" placeholder="Prénom" value="${current.firstName ? current.firstName.replace(/"/g, "&quot;") : ""}" />
        <input id="ep-last" type="text" class="nc-search-input" placeholder="Nom" value="${current.lastName ? current.lastName.replace(/"/g, "&quot;") : ""}" />
      </div>
      <input id="ep-phone" type="tel" class="nc-search-input" placeholder="Numéro de téléphone" value="${current.phoneNumber ? current.phoneNumber.replace(/"/g, "&quot;") : ""}" />
      <textarea id="ep-bio" class="nc-bio-textarea" placeholder="Bio" maxlength="160">${current.bio || ""}</textarea>
      <div class="nc-modal-actions">
        <button class="nc-btn-secondary nc-btn-half" id="ep-cancel">Annuler</button>
        <button class="nc-btn-primary nc-btn-half" id="ep-confirm">Confirmer</button>
      </div>
    `);
    overlay.querySelector("#ep-cancel").onclick = () => { closeOverlay(overlay); resolve(null); };
    overlay.querySelector("#ep-confirm").onclick = () => {
      const result = {
        firstName: overlay.querySelector("#ep-first").value.trim(),
        lastName: overlay.querySelector("#ep-last").value.trim(),
        phoneNumber: overlay.querySelector("#ep-phone").value.trim(),
        bio: overlay.querySelector("#ep-bio").value.trim()
      };
      closeOverlay(overlay);
      resolve(result);
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
