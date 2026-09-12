// icons.js — Icônes SVG en ligne (trait fin, style premium), colorées via
// currentColor pour hériter la couleur du bouton parent. Évite tout usage
// d'emoji ou de glyphes texte pour les actions (retour, appel, envoi...).

function svg(paths, viewBox = "0 0 24 24") {
  return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" class="nc-icon">${paths}</svg>`;
}

export const iconBack = () => svg(`<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);

export const iconPhone = () => svg(`<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`);

export const iconVideo = () => svg(`<rect x="2" y="6" width="14" height="12" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M16 10.5l5-2.8v8.6l-5-2.8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`);

export const iconSend = () => svg(`<path d="M4 12l16-7-6.5 16-2.7-6.8L4 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`);

export const iconAttach = () => svg(`<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`);

export const iconCheck = () => svg(`<path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);

export const iconDoubleCheck = () => svg(`<path d="M1 12l4.5 4.5L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12l4.5 4.5L23 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`, "0 0 24 20");
