// loader.js — gère l'affichage/masquage du nouvel écran de démarrage
// À appeler depuis app.js une fois que Firebase a répondu sur l'état de connexion.

export function showLoader() {
  const el = document.getElementById("nc-loader");
  if (el) el.classList.remove("nc-loader-hidden");
}

export function hideLoader() {
  const el = document.getElementById("nc-loader");
  if (!el) return;
  el.classList.add("nc-loader-hidden");
  setTimeout(() => el.remove(), 450);
}

export function renderLoader() {
  const wrapper = document.createElement("div");
  wrapper.id = "nc-loader";
  wrapper.innerHTML = `
    <div class="nc-loader-mark">
      <span>N</span>
      <div class="nc-loader-ring"></div>
    </div>
    <div>
      <div class="nc-loader-word">NexChat</div>
      <div class="nc-loader-tagline">Secure Messaging</div>
    </div>
  `;
  document.body.prepend(wrapper);
}
