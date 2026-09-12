// app.js — Point d'entrée. Gère la bascule auth <-> app et le routage des onglets.
// Étape 2 : chat 1:1 complet (texte, médias, édition/suppression) ajouté.

import { renderLoader, hideLoader } from "./loader.js?v=9";
import { auth, db } from "./firebase-config.js?v=9";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  requestSignupCode, confirmSignupCode, login, getUserProfile, updateOwnProfile
} from "./auth.js?v=9";
import {
  searchUsersByUsername, sendFriendRequest, getPublicProfile, listFriends,
  getFriendshipStatus, acceptFriendRequest, declineFriendRequest, listFriendRequests
} from "./friends.js?v=9";
import {
  createGroup, listenToMyGroups, getGroup, addMemberToGroup,
  sendGroupMessage, listenToGroupMessages
} from "./groups.js?v=9";
import {
  startConversation, listenToMyConversations, listenToMessages,
  sendMessage, editMessage, deleteMessage, getOtherParticipant,
  getConversation, uploadMedia
} from "./chat.js?v=9";

import {
  createTextStatus, createMediaStatus, listActiveStatusesByAuthor,
  markStatusViewed, deleteStatus
} from "./statuses.js?v=9";

import {
  createListing, listRecentListings, listMyListings, deleteListing, distanceKm
} from "./marketplace.js?v=9";

import { notify, confirmDialog, promptDialog, pickerDialog } from "./modal.js?v=9";

renderLoader();

const authScreen = document.getElementById("nc-auth-screen");
const appShell = document.getElementById("nc-app-shell");

const views = {
  login: document.getElementById("nc-view-login"),
  signup: document.getElementById("nc-view-signup"),
  code: document.getElementById("nc-view-code")
};

function showAuthView(name) {
  Object.values(views).forEach(v => v.hidden = true);
  views[name].hidden = false;
}

document.getElementById("go-signup").onclick = e => { e.preventDefault(); showAuthView("signup"); };
document.getElementById("go-login").onclick = e => { e.preventDefault(); showAuthView("login"); };

document.getElementById("btn-login").onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";
  try {
    await login(email, password);
  } catch (e) {
    errEl.textContent = "Email ou mot de passe incorrect.";
  }
};

document.getElementById("btn-signup").onclick = async () => {
  const username = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const errEl = document.getElementById("signup-error");
  errEl.textContent = "";
  try {
    await requestSignupCode(email, username, password);
    showAuthView("code");
  } catch (e) {
    errEl.textContent = e.message;
  }
};

document.getElementById("btn-confirm-code").onclick = async () => {
  const code = document.getElementById("signup-code").value.trim();
  const errEl = document.getElementById("code-error");
  errEl.textContent = "";
  try {
    await confirmSignupCode(code);
    // onAuthStateChanged prendra le relais pour afficher l'app
  } catch (e) {
    errEl.textContent = e.message;
  }
};

// --- Navigation par onglets ---
const tabButtons = document.querySelectorAll(".nc-tab-btn");
const tabContent = document.getElementById("nc-tab-content");

// Les listeners Firestore actifs (onSnapshot) doivent être coupés en quittant
// un onglet ou une discussion, sinon ils s'accumulent en arrière-plan.
let activeUnsubscribers = [];
function clearActiveListeners() {
  activeUnsubscribers.forEach(unsub => unsub());
  activeUnsubscribers = [];
}

tabButtons.forEach(btn => {
  btn.onclick = () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    clearActiveListeners();
    renderTab(btn.dataset.tab);
  };
});

function renderTab(tab) {
  if (tab === "chats") {
    renderChatsTab();
  } else if (tab === "statuses") {
    renderStatusesTab();
  } else if (tab === "search") {
    renderSearchTab();
  } else if (tab === "groups") {
    renderGroupsTab();
  } else if (tab === "listings") {
    renderListingsTab();
  } else if (tab === "profile") {
    renderProfileTab();
  }
}

// --- Onglet Discussions ---
function renderChatsTab() {
  tabContent.innerHTML = `
    <button id="btn-new-chat" class="nc-btn-primary nc-btn-inline">Nouvelle discussion</button>
    <div id="conversations-list"></div>
  `;

  document.getElementById("btn-new-chat").onclick = openNewChatPicker;

  const unsub = listenToMyConversations(async conversations => {
    const list = document.getElementById("conversations-list");
    if (!list) return; // l'utilisateur a changé d'onglet entre temps
    if (!conversations.length) {
      list.innerHTML = `<p class="nc-placeholder">Aucune discussion pour l'instant.</p>`;
      return;
    }
    const rows = await Promise.all(conversations.map(async conv => {
      const other = await getOtherParticipant(conv);
      return `
        <div class="nc-user-row nc-conversation-row" data-conv="${conv.id}">
          <div>
            <div class="nc-conv-name">${other.username}</div>
            <div class="nc-conv-preview">${conv.lastMessage || "Nouvelle discussion"}</div>
          </div>
        </div>
      `;
    }));
    list.innerHTML = rows.join("");
    list.querySelectorAll(".nc-conversation-row").forEach(row => {
      row.onclick = () => openConversationThread(row.dataset.conv);
    });
  });
  activeUnsubscribers.push(unsub);
}

async function openNewChatPicker() {
  const me = auth.currentUser.uid;
  const friendUids = await listFriends(me);
  if (!friendUids.length) {
    await notify("Ajoute d'abord des amis depuis l'onglet Rechercher pour démarrer une discussion.");
    return;
  }
  const profiles = await Promise.all(friendUids.map(uid => getPublicProfile(uid)));
  const items = friendUids.map((uid, i) => ({
    id: uid,
    label: profiles[i]?.username || "Utilisateur",
    avatarHtml: avatarHtml(profiles[i])
  }));
  const chosenUid = await pickerDialog("Discuter avec qui ?", items);
  if (chosenUid) {
    const convId = await startConversation(chosenUid);
    openConversationThread(convId);
  }
}

async function openConversationThread(conversationId) {
  clearActiveListeners();
  const conversation = await getConversation(conversationId);
  const convSnapUser = await getOtherParticipant(conversation);

  tabContent.innerHTML = `
    <div class="nc-thread">
      <div class="nc-thread-header">
        <button id="btn-back-chats" class="nc-btn-back">←</button>
        <span class="nc-thread-title">${convSnapUser.username}</span>
      </div>
      <div id="thread-messages" class="nc-thread-messages"></div>
      <div class="nc-thread-input-bar">
        <input type="file" id="thread-media-input" accept="image/*,video/*" hidden />
        <button id="btn-attach" class="nc-btn-attach" type="button">+</button>
        <input id="thread-text-input" type="text" placeholder="Écrire un message..." class="nc-thread-input" />
        <button id="btn-send" class="nc-btn-send" type="button">Envoyer</button>
      </div>
    </div>
  `;

  document.getElementById("btn-back-chats").onclick = () => {
    clearActiveListeners();
    renderChatsTab();
  };

  const messagesEl = document.getElementById("thread-messages");
  const me = auth.currentUser.uid;

  const unsub = listenToMessages(conversationId, messages => {
    if (!document.getElementById("thread-messages")) return;
    messagesEl.innerHTML = messages.map(m => renderMessageBubble(m, me, conversationId)).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
    wireMessageActions(messagesEl, conversationId);
  });
  activeUnsubscribers.push(unsub);

  document.getElementById("btn-send").onclick = async () => {
    const input = document.getElementById("thread-text-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await sendMessage(conversationId, { text });
  };

  document.getElementById("btn-attach").onclick = () => {
    document.getElementById("thread-media-input").click();
  };

  document.getElementById("thread-media-input").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url, type } = await uploadMedia(file);
      await sendMessage(conversationId, { mediaUrl: url, mediaType: type });
    } catch (err) {
      await notify("Échec de l'envoi du média : " + err.message);
    }
    e.target.value = "";
  };
}

function linkify(text) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlPattern, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
}

function renderMessageBubble(message, me, conversationId) {
  const mine = message.senderUid === me;
  const bubbleClass = mine ? "nc-bubble nc-bubble-mine" : "nc-bubble nc-bubble-other";
  let content = "";
  if (message.mediaUrl) {
    content = message.mediaType === "video"
      ? `<video src="${message.mediaUrl}" controls class="nc-bubble-media"></video>`
      : `<img src="${message.mediaUrl}" class="nc-bubble-media" />`;
  }
  if (message.text) {
    content += `<div class="nc-bubble-text">${linkify(escapeHtml(message.text))}${message.editedAt ? ' <span class="nc-bubble-edited">(modifié)</span>' : ""}</div>`;
  }
  const actions = mine ? `
    <div class="nc-bubble-actions">
      ${message.text ? `<button class="nc-bubble-action" data-action="edit" data-id="${message.id}" data-text="${encodeURIComponent(message.text)}">Modifier</button>` : ""}
      <button class="nc-bubble-action" data-action="delete" data-id="${message.id}">Supprimer</button>
    </div>
  ` : "";
  return `<div class="${bubbleClass}" data-conv="${conversationId}">${content}${actions}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireMessageActions(container, conversationId) {
  container.querySelectorAll("[data-action='edit']").forEach(btn => {
    btn.onclick = async () => {
      const currentText = decodeURIComponent(btn.dataset.text || "");
      const newText = await promptDialog("Modifier le message", { defaultValue: currentText, multiline: true });
      if (newText) {
        await editMessage(conversationId, btn.dataset.id, newText);
      }
    };
  });
  container.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.onclick = async () => {
      if (await confirmDialog("Supprimer ce message ?")) {
        await deleteMessage(conversationId, btn.dataset.id);
      }
    };
  });
}

// --- Onglet Statuts ---
async function renderStatusesTab() {
  tabContent.innerHTML = `
    <div class="nc-status-actions">
      <button id="btn-status-text" class="nc-btn-secondary nc-btn-half">Statut texte</button>
      <button id="btn-status-media" class="nc-btn-primary nc-btn-half">Photo / Vidéo</button>
    </div>
    <input type="file" id="status-media-input" accept="image/*,video/*" hidden />
    <div id="statuses-list" class="nc-statuses-list"></div>
  `;

  document.getElementById("btn-status-text").onclick = async () => {
    const text = await promptDialog("Ton statut", { placeholder: "Écris quelque chose...", multiline: true });
    if (text) {
      await createTextStatus(text);
      renderStatusesTab();
    }
  };
  document.getElementById("btn-status-media").onclick = () => {
    document.getElementById("status-media-input").click();
  };
  document.getElementById("status-media-input").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await createMediaStatus(file);
      renderStatusesTab();
    } catch (err) {
      await notify("Échec de l'envoi du statut : " + err.message);
    }
  };

  const groups = await listActiveStatusesByAuthor();
  const list = document.getElementById("statuses-list");
  if (!groups.length) {
    list.innerHTML = `<p class="nc-placeholder">Aucun statut actif pour l'instant.</p>`;
    return;
  }
  const me = auth.currentUser.uid;
  const rows = await Promise.all(groups.map(async g => {
    const profile = g.authorUid === me ? await getUserProfile(me) : await getPublicProfile(g.authorUid);
    const label = g.authorUid === me ? "Mon statut" : (profile?.username || "Utilisateur");
    return `
      <div class="nc-status-row" data-author="${g.authorUid}">
        <div class="nc-avatar-medium">${avatarHtml(profile)}</div>
        <div>
          <div class="nc-conv-name">${label}</div>
          <div class="nc-conv-preview">${g.items.length} statut(s)</div>
        </div>
      </div>
    `;
  }));
  list.innerHTML = rows.join("");
  list.querySelectorAll(".nc-status-row").forEach(row => {
    row.onclick = () => {
      const group = groups.find(g => g.authorUid === row.dataset.author);
      openStatusViewer(group.items, group.authorUid === me);
    };
  });
}

function openStatusViewer(items, isMine) {
  let index = 0;
  let timer = null;

  const overlay = document.createElement("div");
  overlay.className = "nc-status-viewer";
  document.body.appendChild(overlay);

  function renderCurrent() {
    clearTimeout(timer);
    const status = items[index];
    if (!status) { closeViewer(); return; }
    markStatusViewed(status.id);

    const duration = status.mediaType === "video" ? 15000 : 5000;

    const bars = items.map((_, i) => `
      <div class="nc-status-bar"><div class="nc-status-bar-fill ${i < index ? "nc-status-bar-full" : ""} ${i === index ? "nc-status-bar-active" : ""}" ${i === index ? `style="animation-duration:${duration}ms"` : ""}></div></div>
    `).join("");

    let mediaHtml = "";
    if (status.mediaType === "text") {
      mediaHtml = `<div class="nc-status-text-slide" style="background:${status.backgroundColor}">${escapeHtml(status.text)}</div>`;
    } else if (status.mediaType === "video") {
      mediaHtml = `<video src="${status.mediaUrl}" class="nc-status-media" autoplay playsinline></video>`;
    } else {
      mediaHtml = `<img src="${status.mediaUrl}" class="nc-status-media" />`;
    }

    const deleteBtn = isMine ? `<button id="btn-status-delete" class="nc-status-delete">Supprimer</button>` : "";
    const viewerCount = isMine ? `<div class="nc-status-viewer-count">${(status.viewedBy || []).length} vue(s)</div>` : "";

    overlay.innerHTML = `
      <div class="nc-status-bars">${bars}</div>
      <button class="nc-status-close" id="btn-status-close">×</button>
      ${deleteBtn}
      ${mediaHtml}
      ${viewerCount}
      <div class="nc-status-tap-left" id="tap-left"></div>
      <div class="nc-status-tap-right" id="tap-right"></div>
    `;

    document.getElementById("btn-status-close").onclick = closeViewer;
    document.getElementById("tap-left").onclick = () => goTo(index - 1);
    document.getElementById("tap-right").onclick = () => goTo(index + 1);
    const delBtn = document.getElementById("btn-status-delete");
    if (delBtn) delBtn.onclick = async () => {
      if (await confirmDialog("Supprimer ce statut ?")) {
        await deleteStatus(status.id);
        items.splice(index, 1);
        if (!items.length) { closeViewer(); return; }
        if (index >= items.length) index = items.length - 1;
        renderCurrent();
      }
    };

    timer = setTimeout(() => goTo(index + 1), duration);
  }

  function goTo(newIndex) {
    if (newIndex < 0) { closeViewer(); return; }
    if (newIndex >= items.length) { closeViewer(); return; }
    index = newIndex;
    renderCurrent();
  }

  function closeViewer() {
    clearTimeout(timer);
    overlay.remove();
    renderStatusesTab();
  }

  renderCurrent();
}

// --- Onglet Annonces (Marketplace) ---
let listingsCache = [];
let userLocation = null;

async function renderListingsTab() {
  tabContent.innerHTML = `
    <div class="nc-status-actions">
      <button id="btn-new-listing" class="nc-btn-primary nc-btn-half">Publier une annonce</button>
      <button id="btn-my-listings" class="nc-btn-secondary nc-btn-half">Mes annonces</button>
    </div>
    <input id="listing-search" type="text" placeholder="Rechercher (titre, ville...)" class="nc-search-input" />
    <div class="nc-listing-filter-row">
      <button id="btn-use-location" class="nc-btn-link">Utiliser ma position</button>
      <select id="radius-select" class="nc-radius-select">
        <option value="">Tout le pays</option>
        <option value="10">10 km</option>
        <option value="25">25 km</option>
        <option value="50">50 km</option>
        <option value="100">100 km</option>
      </select>
    </div>
    <div id="listings-grid" class="nc-listings-grid"></div>
  `;

  document.getElementById("btn-new-listing").onclick = openListingForm;
  document.getElementById("btn-my-listings").onclick = renderMyListings;
  document.getElementById("btn-use-location").onclick = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyListingFilters();
      },
      () => notify("Impossible de récupérer ta position.")
    );
  };
  document.getElementById("listing-search").oninput = applyListingFilters;
  document.getElementById("radius-select").onchange = applyListingFilters;

  listingsCache = await listRecentListings();
  applyListingFilters();
}

function applyListingFilters() {
  const searchEl = document.getElementById("listing-search");
  const radiusEl = document.getElementById("radius-select");
  if (!searchEl || !radiusEl) return;

  const term = searchEl.value.trim().toLowerCase();
  const radius = parseFloat(radiusEl.value);

  let filtered = listingsCache.filter(l => {
    const matchesTerm = !term ||
      l.title.toLowerCase().includes(term) ||
      l.city.toLowerCase().includes(term);
    if (!matchesTerm) return false;
    if (radius && userLocation && l.lat != null && l.lng != null) {
      return distanceKm(userLocation.lat, userLocation.lng, l.lat, l.lng) <= radius;
    }
    return true;
  });

  renderListingsGrid(filtered);
}

function renderListingsGrid(listings) {
  const grid = document.getElementById("listings-grid");
  if (!grid) return;
  if (!listings.length) {
    grid.innerHTML = `<p class="nc-placeholder">Aucune annonce trouvée.</p>`;
    return;
  }
  grid.innerHTML = listings.map(l => `
    <div class="nc-listing-card" data-id="${l.id}">
      ${l.photoUrl ? `<img src="${l.photoUrl}" class="nc-listing-photo" />` : `<div class="nc-listing-photo nc-listing-photo-empty"></div>`}
      <div class="nc-listing-info">
        <div class="nc-listing-title">${escapeHtml(l.title)}</div>
        <div class="nc-listing-price">${l.price} ${l.currency}</div>
        <div class="nc-listing-city">${escapeHtml(l.city)}</div>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".nc-listing-card").forEach(card => {
    card.onclick = () => openListingDetail(listings.find(l => l.id === card.dataset.id));
  });
}

async function renderMyListings() {
  const mine = await listMyListings();
  renderListingsGrid(mine);
}

function openListingDetail(listing) {
  const me = auth.currentUser.uid;
  const isMine = listing.sellerUid === me;
  tabContent.innerHTML = `
    <button id="btn-back-listings" class="nc-btn-back">←</button>
    <div class="nc-listing-detail">
      ${listing.photoUrl ? `<img src="${listing.photoUrl}" class="nc-listing-detail-photo" />` : ""}
      <h2>${escapeHtml(listing.title)}</h2>
      <p class="nc-listing-detail-price">${listing.price} ${listing.currency}</p>
      <p class="nc-listing-detail-city">${escapeHtml(listing.city)}</p>
      <p class="nc-listing-detail-desc">${escapeHtml(listing.description)}</p>
      ${isMine
        ? `<button id="btn-delete-listing" class="nc-btn-secondary nc-btn-inline">Supprimer l'annonce</button>`
        : `<button id="btn-contact-seller" class="nc-btn-primary nc-btn-inline">Contacter le vendeur</button>`
      }
    </div>
  `;
  document.getElementById("btn-back-listings").onclick = renderListingsTab;
  const delBtn = document.getElementById("btn-delete-listing");
  if (delBtn) delBtn.onclick = async () => {
    if (await confirmDialog("Supprimer cette annonce ?")) {
      await deleteListing(listing.id);
      renderListingsTab();
    }
  };
  const contactBtn = document.getElementById("btn-contact-seller");
  if (contactBtn) contactBtn.onclick = async () => {
    const convId = await startConversation(listing.sellerUid);
    openConversationThread(convId);
  };
}

function openListingForm() {
  tabContent.innerHTML = `
    <button id="btn-back-listings" class="nc-btn-back">←</button>
    <div class="nc-listing-form">
      <input id="listing-title" type="text" placeholder="Titre de l'annonce" class="nc-search-input" />
      <textarea id="listing-desc" placeholder="Description" class="nc-bio-textarea"></textarea>
      <div class="nc-listing-form-row">
        <input id="listing-price" type="number" placeholder="Prix" class="nc-search-input" />
        <select id="listing-currency" class="nc-radius-select">
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="XOF">XOF</option>
        </select>
      </div>
      <input id="listing-city" type="text" placeholder="Ville" class="nc-search-input" />
      <button id="btn-listing-location" class="nc-btn-link">Utiliser ma position actuelle</button>
      <input type="file" id="listing-photo" accept="image/*" class="nc-search-input" />
      <button id="btn-publish-listing" class="nc-btn-primary nc-btn-inline">Publier</button>
      <p class="nc-auth-error" id="listing-error"></p>
    </div>
  `;
  document.getElementById("btn-back-listings").onclick = renderListingsTab;

  let coords = null;
  document.getElementById("btn-listing-location").onclick = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        notify("Position enregistrée pour cette annonce.");
      },
      () => notify("Impossible de récupérer ta position.")
    );
  };

  document.getElementById("btn-publish-listing").onclick = async () => {
    const title = document.getElementById("listing-title").value.trim();
    const description = document.getElementById("listing-desc").value.trim();
    const price = document.getElementById("listing-price").value;
    const currency = document.getElementById("listing-currency").value;
    const city = document.getElementById("listing-city").value.trim();
    const photoFile = document.getElementById("listing-photo").files[0] || null;
    const errEl = document.getElementById("listing-error");
    errEl.textContent = "";
    if (!title || !city) {
      errEl.textContent = "Le titre et la ville sont obligatoires.";
      return;
    }
    try {
      await createListing({
        title, description, price, currency, city, photoFile,
        lat: coords?.lat, lng: coords?.lng
      });
      renderListingsTab();
    } catch (err) {
      errEl.textContent = "Échec de la publication : " + err.message;
    }
  };
}
function renderSearchTab() {
  tabContent.innerHTML = `
    <input id="search-input" type="text" placeholder="Rechercher un nom d'utilisateur" class="nc-search-input" />
    <div id="search-results"></div>
  `;
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  input.oninput = async () => {
    const users = await searchUsersByUsername(input.value);
    results.innerHTML = users.map(u => `
      <div class="nc-user-row">
        <span class="nc-user-link" data-action="view" data-uid="${u.uid}">${u.username}</span>
        <button class="nc-btn-small" data-action="add" data-uid="${u.uid}">Ajouter</button>
      </div>
    `).join("") || `<p class="nc-placeholder">Aucun résultat.</p>`;
  };
  results.onclick = async e => {
    if (e.target.dataset.action === "add") {
      await sendFriendRequest(e.target.dataset.uid);
      e.target.textContent = "Demande envoyée";
      e.target.disabled = true;
    } else if (e.target.dataset.action === "view") {
      openPublicProfile(e.target.dataset.uid);
    }
  };
}

function avatarHtml(profile) {
  if (profile?.photoURL) {
    return `<img src="${profile.photoURL}" class="nc-avatar-img" />`;
  }
  const initial = (profile?.username || "?").charAt(0).toUpperCase();
  return `<div class="nc-avatar-fallback">${initial}</div>`;
}

async function openPublicProfile(uid) {
  clearActiveListeners();
  const [profile, status] = await Promise.all([getPublicProfile(uid), getFriendshipStatus(uid)]);

  let actionHtml = "";
  if (status === "friends") {
    actionHtml = `<button id="btn-profile-message" class="nc-btn-primary nc-btn-inline">Envoyer un message</button>`;
  } else if (status === "pending_sent") {
    actionHtml = `<button class="nc-btn-primary nc-btn-inline" disabled>Demande envoyée</button>`;
  } else if (status === "pending_received") {
    actionHtml = `
      <div class="nc-profile-request-actions">
        <button id="btn-profile-accept" class="nc-btn-primary nc-btn-inline">Accepter</button>
        <button id="btn-profile-decline" class="nc-btn-secondary nc-btn-inline">Refuser</button>
      </div>
    `;
  } else {
    actionHtml = `<button id="btn-profile-add" class="nc-btn-primary nc-btn-inline">Ajouter en ami</button>`;
  }

  tabContent.innerHTML = `
    <div class="nc-public-profile">
      <button id="btn-back-profile" class="nc-btn-back">←</button>
      <div class="nc-avatar-large">${avatarHtml(profile)}</div>
      <p class="nc-profile-username">${profile?.username || "Utilisateur"}</p>
      <p class="nc-profile-bio">${profile?.bio ? escapeHtml(profile.bio) : ""}</p>
      ${actionHtml}
    </div>
  `;

  document.getElementById("btn-back-profile").onclick = () => renderSearchTab();

  const addBtn = document.getElementById("btn-profile-add");
  if (addBtn) addBtn.onclick = async () => {
    await sendFriendRequest(uid);
    openPublicProfile(uid);
  };

  const msgBtn = document.getElementById("btn-profile-message");
  if (msgBtn) msgBtn.onclick = async () => {
    const convId = await startConversation(uid);
    openConversationThread(convId);
  };

  const acceptBtn = document.getElementById("btn-profile-accept");
  if (acceptBtn) acceptBtn.onclick = async () => {
    await acceptFriendRequest(uid);
    openPublicProfile(uid);
  };

  const declineBtn = document.getElementById("btn-profile-decline");
  if (declineBtn) declineBtn.onclick = async () => {
    await declineFriendRequest(uid);
    renderSearchTab();
  };
}

// --- Onglet Groupes ---
function renderGroupsTab() {
  tabContent.innerHTML = `
    <button id="btn-new-group" class="nc-btn-primary nc-btn-inline">Créer un groupe</button>
    <div id="groups-list"></div>
  `;
  document.getElementById("btn-new-group").onclick = async () => {
    const name = await promptDialog("Nom du groupe", { placeholder: "Ex : Équipe projet" });
    if (name) await createGroup(name, []);
  };
  const unsub = listenToMyGroups(groups => {
    const list = document.getElementById("groups-list");
    if (!list) return;
    list.innerHTML = groups.map(g => `
      <div class="nc-user-row nc-conversation-row" data-group="${g.id}">
        <div>
          <div class="nc-conv-name">${g.name}</div>
          <div class="nc-conv-preview">${g.memberUids.length} membre(s)</div>
        </div>
      </div>
    `).join("") || `<p class="nc-placeholder">Aucun groupe pour l'instant.</p>`;
    list.querySelectorAll(".nc-conversation-row").forEach(row => {
      row.onclick = () => openGroupThread(row.dataset.group);
    });
  });
  activeUnsubscribers.push(unsub);
}

async function openGroupThread(groupId) {
  clearActiveListeners();
  const group = await getGroup(groupId);
  const memberProfiles = await Promise.all(group.memberUids.map(uid => getPublicProfile(uid)));
  const memberNames = {};
  group.memberUids.forEach((uid, i) => { memberNames[uid] = memberProfiles[i]?.username || "Utilisateur"; });

  tabContent.innerHTML = `
    <div class="nc-thread">
      <div class="nc-thread-header">
        <button id="btn-back-groups" class="nc-btn-back">←</button>
        <span class="nc-thread-title">${group.name}</span>
        <button id="btn-add-member" class="nc-btn-small nc-btn-add-member">Ajouter</button>
      </div>
      <div id="thread-messages" class="nc-thread-messages"></div>
      <div class="nc-thread-input-bar">
        <input type="file" id="thread-media-input" accept="image/*,video/*" hidden />
        <button id="btn-attach" class="nc-btn-attach" type="button">+</button>
        <input id="thread-text-input" type="text" placeholder="Écrire un message..." class="nc-thread-input" />
        <button id="btn-send" class="nc-btn-send" type="button">Envoyer</button>
      </div>
    </div>
  `;

  document.getElementById("btn-back-groups").onclick = () => {
    clearActiveListeners();
    renderGroupsTab();
  };

  document.getElementById("btn-add-member").onclick = async () => {
    const me = auth.currentUser.uid;
    const friendUids = (await listFriends(me)).filter(uid => !group.memberUids.includes(uid));
    if (!friendUids.length) {
      await notify("Tous tes amis sont déjà dans ce groupe (ou tu n'as pas encore d'amis).");
      return;
    }
    const profiles = await Promise.all(friendUids.map(uid => getPublicProfile(uid)));
    const items = friendUids.map((uid, i) => ({
      id: uid,
      label: profiles[i]?.username || "Utilisateur",
      avatarHtml: avatarHtml(profiles[i])
    }));
    const chosenUid = await pickerDialog("Ajouter qui au groupe ?", items);
    if (chosenUid) {
      const chosenIndex = friendUids.indexOf(chosenUid);
      await addMemberToGroup(groupId, chosenUid);
      group.memberUids.push(chosenUid);
      memberNames[chosenUid] = profiles[chosenIndex].username;
    }
  };

  const messagesEl = document.getElementById("thread-messages");
  const me = auth.currentUser.uid;

  const unsub = listenToGroupMessages(groupId, messages => {
    if (!document.getElementById("thread-messages")) return;
    messagesEl.innerHTML = messages.map(m => renderGroupMessageBubble(m, me, memberNames)).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
  activeUnsubscribers.push(unsub);

  document.getElementById("btn-send").onclick = async () => {
    const input = document.getElementById("thread-text-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await sendGroupMessage(groupId, { text });
  };

  document.getElementById("btn-attach").onclick = () => {
    document.getElementById("thread-media-input").click();
  };

  document.getElementById("thread-media-input").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url, type } = await uploadMedia(file);
      await sendGroupMessage(groupId, { mediaUrl: url, mediaType: type });
    } catch (err) {
      await notify("Échec de l'envoi du média : " + err.message);
    }
    e.target.value = "";
  };
}

function renderGroupMessageBubble(message, me, memberNames) {
  const mine = message.senderUid === me;
  const bubbleClass = mine ? "nc-bubble nc-bubble-mine" : "nc-bubble nc-bubble-other";
  let content = "";
  if (!mine) {
    content += `<div class="nc-bubble-sender">${memberNames[message.senderUid] || "Utilisateur"}</div>`;
  }
  if (message.mediaUrl) {
    content += message.mediaType === "video"
      ? `<video src="${message.mediaUrl}" controls class="nc-bubble-media"></video>`
      : `<img src="${message.mediaUrl}" class="nc-bubble-media" />`;
  }
  if (message.text) {
    content += `<div class="nc-bubble-text">${linkify(escapeHtml(message.text))}</div>`;
  }
  return `<div class="${bubbleClass}">${content}</div>`;
}

// --- Onglet Profil ---
async function renderProfileTab() {
  const profile = await getUserProfile(auth.currentUser.uid);
  tabContent.innerHTML = `
    <div class="nc-profile-block">
      <div class="nc-avatar-large">
        ${avatarHtml(profile)}
      </div>
      <input type="file" id="avatar-input" accept="image/*" hidden />
      <button id="btn-change-photo" class="nc-btn-link">Changer la photo</button>

      <p class="nc-profile-username">${profile?.username || ""}</p>
      <p class="nc-profile-email">${profile?.email || ""}</p>

      <div id="bio-display">
        <p class="nc-profile-bio">${profile?.bio ? escapeHtml(profile.bio) : "Aucune bio pour l'instant."}</p>
        <button id="btn-edit-bio" class="nc-btn-link">Modifier la bio</button>
      </div>
      <div id="bio-edit" hidden>
        <textarea id="bio-textarea" class="nc-bio-textarea" maxlength="160">${profile?.bio || ""}</textarea>
        <button id="btn-save-bio" class="nc-btn-primary nc-btn-inline">Enregistrer</button>
      </div>

      <button id="btn-logout" class="nc-btn-primary nc-btn-inline">Se déconnecter</button>

      <h3 class="nc-section-title">Demandes d'amis reçues</h3>
      <div id="friend-requests-list"></div>
    </div>
  `;

  document.getElementById("btn-logout").onclick = () => signOut(auth);

  document.getElementById("btn-change-photo").onclick = () => {
    document.getElementById("avatar-input").click();
  };
  document.getElementById("avatar-input").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadMedia(file);
      await updateOwnProfile({ photoURL: url });
      renderProfileTab();
    } catch (err) {
      await notify("Échec de l'envoi de la photo : " + err.message);
    }
  };

  document.getElementById("btn-edit-bio").onclick = () => {
    document.getElementById("bio-display").hidden = true;
    document.getElementById("bio-edit").hidden = false;
  };
  document.getElementById("btn-save-bio").onclick = async () => {
    const newBio = document.getElementById("bio-textarea").value.trim();
    await updateOwnProfile({ bio: newBio });
    renderProfileTab();
  };

  const requests = await listFriendRequests();
  const requestsList = document.getElementById("friend-requests-list");
  if (!requests.length) {
    requestsList.innerHTML = `<p class="nc-placeholder">Aucune demande en attente.</p>`;
  } else {
    const senderProfiles = await Promise.all(requests.map(r => getPublicProfile(r.from)));
    requestsList.innerHTML = requests.map((r, i) => `
      <div class="nc-user-row">
        <span>${senderProfiles[i]?.username || "Utilisateur"}</span>
        <div class="nc-request-buttons">
          <button class="nc-btn-small" data-action="accept" data-uid="${r.from}">Accepter</button>
          <button class="nc-btn-small nc-btn-decline" data-action="decline" data-uid="${r.from}">Refuser</button>
        </div>
      </div>
    `).join("");
    requestsList.onclick = async e => {
      const uid = e.target.dataset.uid;
      if (!uid) return;
      if (e.target.dataset.action === "accept") {
        await acceptFriendRequest(uid);
      } else if (e.target.dataset.action === "decline") {
        await declineFriendRequest(uid);
      }
      renderProfileTab();
    };
  }
}

// --- État d'authentification ---
onAuthStateChanged(auth, async user => {
  if (user) {
    authScreen.hidden = true;
    appShell.hidden = false;
    renderTab("chats");
  } else {
    appShell.hidden = true;
    authScreen.hidden = false;
    showAuthView("login");
  }
  hideLoader();
});
