// app.js — Point d'entrée. Gère la bascule auth <-> app et le routage des onglets.
// Étape 3 : Marketplace refaite (boutiques, produits, commandes, messagerie boutique).

import { renderLoader, hideLoader } from "./loader.js?v=47";
import { auth, db } from "./firebase-config.js?v=47";
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  requestSignupCode, confirmSignupCode, login, getUserProfile, updateOwnProfile
} from "./auth.js?v=47";
import {
  searchUsersByUsername, sendFriendRequest, getPublicProfile, listFriends,
  getFriendshipStatus, acceptFriendRequest, declineFriendRequest, listFriendRequests
} from "./friends.js?v=47";
import {
  createGroup, listenToMyGroups, getGroup, addMemberToGroup,
  sendGroupMessage, listenToGroupMessages
} from "./groups.js?v=47";
import {
  startConversation, listenToMyConversations, listenToMessages,
  sendMessage, editMessage, deleteMessage, getOtherParticipant,
  getConversation, uploadMedia, uploadMediaWithProgress
} from "./chat.js?v=47";

import {
  createTextStatus, createMediaStatus, listActiveStatusesByAuthor,
  markStatusViewed, deleteStatus
} from "./statuses.js?v=47";

import {
  createOrUpdateShop, getMyShop, getShop, listShops,
  createProduct, updateProduct, deleteProduct, listProducts, listProductsByShop, listMyProducts,
  placeOrder, listMyOrders, listShopOrders, updateOrderStatus, distanceKm
} from "./marketplace.js?v=48";

import {
  threadIdFor, startShopThread, listenToMyShopThreads, listenToShopMessages, sendShopMessage
} from "./shopchat.js?v=48";

import {
  startCall, answerCall, declineCall, listenForIncomingCalls
} from "./calls.js?v=47";
import {
  iconBack, iconPhone, iconVideo, iconSend, iconAttach, iconCheck,
  iconChat, iconStatusRing, iconGroups, iconTag, iconSearch, iconUser,
  iconMore, iconClose, iconLogout, iconSettings, iconContactCard,
  iconCamera, iconEdit
} from "./icons.js?v=47";
import {
  notify, confirmDialog, promptDialog, pickerDialog, openPhotoUploadDialog,
  editProfileDialog
} from "./modal.js?v=47";

renderLoader();

// Filet de sécurité : toute erreur asynchrone non gérée s'affiche à l'utilisateur
// au lieu de bloquer silencieusement l'interface.
window.addEventListener("unhandledrejection", event => {
  console.error("Erreur non gérée :", event.reason);
  notify("Une erreur est survenue : " + (event.reason?.message || String(event.reason)));
});

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
const TABS = [
  { key: "statuses", icon: iconStatusRing, label: "Statuts" },
  { key: "groups", icon: iconGroups, label: "Groupes" },
  { key: "search", icon: iconContactCard, label: "Contacts" },
  { key: "more", icon: iconMore, label: "Plus" }
];

const ALL_DESTINATIONS = [
  { key: "chats", icon: iconChat, label: "Chats" },
  { key: "statuses", icon: iconStatusRing, label: "Statuts" },
  { key: "groups", icon: iconGroups, label: "Groupes" },
  { key: "listings", icon: iconTag, label: "Marketplace" },
  { key: "shopMessages", icon: iconChat, label: "Messages boutique" },
  { key: "search", icon: iconContactCard, label: "Contacts" },
  { key: "profile", icon: iconUser, label: "Profil" },
  { key: "settings", icon: iconSettings, label: "Paramètres" }
];

const tabbarEl = document.getElementById("nc-tabbar");
tabbarEl.innerHTML = TABS.map(t => `
  <button data-tab="${t.key}" class="nc-tab-btn">
    <span class="nc-tab-icon-wrap">${t.icon()}</span>
    <span class="nc-tab-label">${t.label}</span>
  </button>
`).join("") + `<button data-tab="chats" class="nc-fab-tab active" type="button">${iconChat()}</button>`;

function openMoreMenu() {
  const sheet = document.createElement("div");
  sheet.className = "nc-sheet-overlay";
  sheet.innerHTML = `
    <div class="nc-sheet">
      <div class="nc-sheet-handle"></div>
      <div class="nc-sheet-header">
        <h3>Navigation</h3>
        <button id="btn-close-sheet" class="nc-icon-btn nc-sheet-close">${iconClose()}</button>
      </div>
      <div class="nc-sheet-list">
        ${ALL_DESTINATIONS.map(d => `
          <button class="nc-sheet-row" data-tab="${d.key}">
            <span class="nc-sheet-row-icon">${d.icon()}</span>
            <span>${d.label}</span>
          </button>
        `).join("")}
        <div class="nc-sheet-divider"></div>
        <button class="nc-sheet-row nc-sheet-row-danger" id="btn-sheet-logout">
          <span class="nc-sheet-row-icon">${iconLogout()}</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);

  function close() { sheet.remove(); }
  sheet.onclick = e => { if (e.target === sheet) close(); };
  document.getElementById("btn-close-sheet").onclick = close;
  sheet.querySelectorAll(".nc-sheet-row[data-tab]").forEach(row => {
    row.onclick = () => { close(); switchToTab(row.dataset.tab); };
  });
  document.getElementById("btn-sheet-logout").onclick = () => { close(); signOut(auth); };
}

const tabButtons = document.querySelectorAll(".nc-tab-btn, .nc-fab-tab");
const tabContent = document.getElementById("nc-tab-content");

// Les listeners Firestore actifs (onSnapshot) doivent être coupés en quittant
// un onglet ou une discussion, sinon ils s'accumulent en arrière-plan.
let activeUnsubscribers = [];
function clearActiveListeners() {
  activeUnsubscribers.forEach(unsub => unsub());
  activeUnsubscribers = [];
}

function hideTabbar() {
  tabbarEl.classList.add("nc-tabbar-hidden");
}

function showTabbar() {
  tabbarEl.classList.remove("nc-tabbar-hidden");
}

function switchToTab(tabKey) {
  tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === tabKey));
  clearActiveListeners();
  tabContent.classList.toggle("nc-mp", tabKey === "listings");
  showTabbar();
  renderTab(tabKey);
}

tabButtons.forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.tab === "more") {
      openMoreMenu();
    } else {
      switchToTab(btn.dataset.tab);
    }
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
  } else if (tab === "shopMessages") {
    renderShopMessagesTab();
  } else if (tab === "profile") {
    renderProfileTab();
  } else if (tab === "settings") {
    renderSettingsTab();
  }
}

// --- Onglet Discussions ---
async function renderChatsTab() {
  showTabbar();
  const me = auth.currentUser.uid;
  const myProfile = await getUserProfile(me);

  tabContent.innerHTML = `
    <div class="nc-page-title">
      <div class="nc-header-top">
        <button id="btn-header-menu" class="nc-icon-btn nc-header-icon" type="button">${iconMore()}</button>
        <span class="nc-header-title-text">NexChat</span>
        <button id="btn-header-me" class="nc-header-avatar-btn" type="button">${avatarHtml(myProfile)}</button>
      </div>
      <div class="nc-header-strip">
        <button id="btn-header-search" class="nc-header-search-btn" type="button">${iconSearch()}</button>
        <div id="header-contacts-strip" class="nc-header-contacts-strip"></div>
      </div>
    </div>
    <div id="chats-search-bar" class="nc-chats-search-bar" hidden>
      <input id="chats-search-input" class="nc-chats-search-input" placeholder="Rechercher une discussion" />
    </div>
    <div id="conversations-list"></div>
  `;

  document.getElementById("btn-header-menu").onclick = openMoreMenu;
  document.getElementById("btn-header-me").onclick = () => switchToTab("profile");

  const searchBar = document.getElementById("chats-search-bar");
  const searchInput = document.getElementById("chats-search-input");
  document.getElementById("btn-header-search").onclick = () => {
    searchBar.hidden = !searchBar.hidden;
    if (!searchBar.hidden) searchInput.focus();
    else { searchInput.value = ""; filterChatRows(""); }
  };
  searchInput.oninput = () => filterChatRows(searchInput.value);
  function filterChatRows(term) {
    const q = term.trim().toLowerCase();
    document.querySelectorAll("#conversations-list .nc-chat-list-row").forEach(row => {
      const name = row.querySelector(".nc-chat-list-name")?.textContent.toLowerCase() || "";
      row.style.display = !q || name.includes(q) ? "" : "none";
    });
  }

  listFriends(me).then(async friendUids => {
    const strip = document.getElementById("header-contacts-strip");
    if (!strip) return;
    if (!friendUids.length) return;
    const profiles = await Promise.all(friendUids.slice(0, 12).map(uid => getPublicProfile(uid)));
    strip.innerHTML = friendUids.slice(0, 12).map((uid, i) => `
      <button class="nc-header-contact-avatar" data-uid="${uid}" type="button">${avatarHtml(profiles[i])}</button>
    `).join("");
    strip.querySelectorAll(".nc-header-contact-avatar").forEach(btn => {
      btn.onclick = async () => {
        try {
          const convId = await startConversation(btn.dataset.uid);
          await openConversationThread(convId);
        } catch (err) {
          await notify("Impossible d'ouvrir la discussion : " + err.message);
        }
      };
    });
  }).catch(() => {});

  const unsub = listenToMyConversations(async conversations => {
    const list = document.getElementById("conversations-list");
    if (!list) return; // l'utilisateur a changé d'onglet entre temps
    if (!conversations.length) {
      list.innerHTML = `<p class="nc-placeholder">Aucune discussion pour l'instant.</p>`;
      return;
    }
    const rows = await Promise.all(conversations.map(async conv => {
      const other = await getOtherParticipant(conv);
      const date = conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate() : null;
      return `
        <div class="nc-chat-list-row" data-conv="${conv.id}">
          <div class="nc-avatar-medium">${avatarHtml(other)}</div>
          <div class="nc-chat-list-info">
            <div class="nc-chat-list-name">${escapeHtml(other.username)}</div>
            <div class="nc-chat-list-preview">${escapeHtml(conv.lastMessage || "Nouvelle discussion")}</div>
          </div>
          <div class="nc-chat-list-time">${date ? formatTime(date) : ""}</div>
        </div>
      `;
    }));
    list.innerHTML = rows.join("");
    list.querySelectorAll(".nc-chat-list-row").forEach(row => {
      row.onclick = () => openConversationThread(row.dataset.conv);
    });
    filterChatRows(searchInput.value);
  }, err => {
    notify("Impossible de charger les discussions : " + err.message);
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
    try {
      const convId = await startConversation(chosenUid);
      await openConversationThread(convId);
    } catch (err) {
      await notify("Impossible d'ouvrir la discussion : " + err.message);
    }
  }
}

async function openConversationThread(conversationId) {
  hideTabbar();
  clearActiveListeners();
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    await notify("Cette discussion est introuvable (elle a peut-être été supprimée).");
    renderChatsTab();
    return;
  }
  const convSnapUser = await getOtherParticipant(conversation);

  tabContent.innerHTML = `
    <div class="nc-thread">
      <div class="nc-thread-header">
        <button id="btn-back-chats" class="nc-icon-btn nc-btn-back">${iconBack()}</button>
        <div class="nc-avatar-header">${avatarHtml(convSnapUser)}</div>
        <div class="nc-thread-header-info">
          <span class="nc-thread-title">${convSnapUser.username}</span>
          <span class="nc-thread-subtitle">En ligne</span>
        </div>
        <button id="btn-call-audio" class="nc-icon-btn" type="button" title="Appel audio">${iconPhone()}</button>
        <button id="btn-call-video" class="nc-icon-btn" type="button" title="Appel vidéo">${iconVideo()}</button>
      </div>
      <div id="thread-messages" class="nc-thread-messages"></div>
      <div class="nc-thread-input-bar">
        <input type="file" id="thread-media-input" accept="image/*,video/*" hidden />
        <button id="btn-attach" class="nc-icon-btn nc-btn-attach" type="button">${iconAttach()}</button>
        <input id="thread-text-input" type="text" placeholder="Écrire un message..." class="nc-thread-input" />
        <button id="btn-send" class="nc-btn-send-round" type="button">${iconSend()}</button>
      </div>
    </div>
  `;

  document.getElementById("btn-back-chats").onclick = () => {
    clearActiveListeners();
    renderChatsTab();
  };

  document.getElementById("btn-call-audio").onclick = () => initiateCall(convSnapUser, "audio");
  document.getElementById("btn-call-video").onclick = () => initiateCall(convSnapUser, "video");

  const messagesEl = document.getElementById("thread-messages");
  const me = auth.currentUser.uid;

  const unsub = listenToMessages(conversationId, messages => {
    if (!document.getElementById("thread-messages")) return;
    messagesEl.innerHTML = buildMessagesHtml(messages, me, conversationId);
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

function formatDaySeparator(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function buildMessagesHtml(messages, me, conversationId) {
  let html = "";
  let lastDateKey = null;
  messages.forEach(m => {
    const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
    const dateKey = date.toDateString();
    if (dateKey !== lastDateKey) {
      html += `<div class="nc-date-separator"><span>${formatDaySeparator(date)}</span></div>`;
      lastDateKey = dateKey;
    }
    html += renderMessageBubble(m, me, conversationId, date);
  });
  return html;
}

function renderMessageBubble(message, me, conversationId, date) {
  const mine = message.senderUid === me;
  const bubbleClass = mine ? "nc-bubble nc-bubble-mine" : "nc-bubble nc-bubble-other";
  const rowClass = mine ? "nc-msg-row nc-msg-row-mine" : "nc-msg-row nc-msg-row-other";
  let content = "";
  if (message.mediaUrl) {
    content = message.mediaType === "video"
      ? `<video src="${message.mediaUrl}" controls class="nc-bubble-media"></video>`
      : `<img src="${message.mediaUrl}" class="nc-bubble-media" />`;
  }
  if (message.text) {
    content += `<div class="nc-bubble-text">${linkify(escapeHtml(message.text))}${message.editedAt ? ' <span class="nc-bubble-edited">(modifié)</span>' : ""}</div>`;
  }
  const meta = `
    <div class="nc-bubble-meta">
      <span class="nc-bubble-time">${date ? formatTime(date) : ""}</span>
      ${mine ? `<span class="nc-bubble-check">${iconCheck()}</span>` : ""}
    </div>
  `;
  const actions = mine ? `
    <div class="nc-bubble-actions">
      ${message.text ? `<button class="nc-bubble-action" data-action="edit" data-id="${message.id}" data-text="${encodeURIComponent(message.text)}">Modifier</button>` : ""}
      <button class="nc-bubble-action" data-action="delete" data-id="${message.id}">Supprimer</button>
    </div>
  ` : "";
  return `
    <div class="${rowClass}" data-conv="${conversationId}">
      <div class="${bubbleClass}">${content}</div>
      <div class="nc-bubble-footer">${meta}${actions}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireMessageActions(container, conversationId) {
  container.querySelectorAll(".nc-msg-row-mine .nc-bubble").forEach(bubble => {
    bubble.onclick = () => {
      const footer = bubble.nextElementSibling;
      if (footer) footer.classList.toggle("nc-bubble-footer-open");
    };
  });
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
  showTabbar();
  tabContent.innerHTML = `
    <h1 class="nc-page-title">NexChat</h1>
    <h3 class="nc-section-title">Statut</h3>
    <div id="my-status-row"></div>
    <input type="file" id="status-media-input" accept="image/*,video/*" hidden />
    <div id="recent-updates-section" hidden>
      <h4 class="nc-status-group-label">Mises à jour récentes</h4>
      <div id="recent-updates-list"></div>
    </div>
    <div id="viewed-updates-section" hidden>
      <h4 class="nc-status-group-label">Mises à jour vues</h4>
      <div id="viewed-updates-list"></div>
    </div>
  `;

  const me = auth.currentUser.uid;
  const groups = await listActiveStatusesByAuthor();
  const myGroup = groups.find(g => g.authorUid === me);
  const otherGroups = groups.filter(g => g.authorUid !== me);

  const myProfile = await getUserProfile(me);
  const hasMyStatus = !!myGroup;
  document.getElementById("my-status-row").innerHTML = `
    <div class="nc-chat-list-row" id="my-status-clickable">
      <div class="nc-status-avatar-wrap">
        <div class="nc-avatar-medium ${hasMyStatus ? "nc-ring-unviewed" : "nc-ring-none"}">${avatarHtml(myProfile)}</div>
        ${!hasMyStatus ? `<span class="nc-status-add-badge">+</span>` : ""}
      </div>
      <div class="nc-chat-list-info">
        <div class="nc-chat-list-name">Mon statut</div>
        <div class="nc-chat-list-preview">${hasMyStatus ? "Appuie pour voir" : "Disparaît au bout de 24 heures"}</div>
      </div>
    </div>
  `;
  document.getElementById("my-status-clickable").onclick = async () => {
    if (hasMyStatus) {
      openStatusViewer(myGroup.items, true);
      return;
    }
    const choice = await pickerDialog("Ajouter un statut", [
      { id: "text", label: "Statut texte" },
      { id: "media", label: "Photo ou vidéo" }
    ]);
    if (choice === "text") {
      const text = await promptDialog("Ton statut", { placeholder: "Écris quelque chose...", multiline: true });
      if (text) { await createTextStatus(text); renderStatusesTab(); }
    } else if (choice === "media") {
      document.getElementById("status-media-input").click();
    }
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

  const recent = [];
  const viewed = [];
  otherGroups.forEach(g => {
    const allViewed = g.items.every(s => (s.viewedBy || []).includes(me));
    (allViewed ? viewed : recent).push(g);
  });

  async function renderGroupList(containerId, sectionId, list, ringClass) {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(containerId);
    if (!list.length) { section.hidden = true; return; }
    section.hidden = false;
    const rows = await Promise.all(list.map(async g => {
      const profile = await getPublicProfile(g.authorUid);
      const lastItem = g.items[g.items.length - 1];
      const date = lastItem?.createdAt?.toDate ? lastItem.createdAt.toDate() : null;
      return `
        <div class="nc-chat-list-row" data-author="${g.authorUid}">
          <div class="nc-avatar-medium ${ringClass}">${avatarHtml(profile)}</div>
          <div class="nc-chat-list-info">
            <div class="nc-chat-list-name">${escapeHtml(profile?.username || "Utilisateur")}</div>
            <div class="nc-chat-list-preview">${g.items.length} statut(s)</div>
          </div>
          <div class="nc-chat-list-time">${date ? formatTime(date) : ""}</div>
        </div>
      `;
    }));
    container.innerHTML = rows.join("");
    container.querySelectorAll(".nc-chat-list-row[data-author]").forEach(row => {
      row.onclick = () => {
        const group = list.find(g => g.authorUid === row.dataset.author);
        openStatusViewer(group.items, false);
      };
    });
  }

  await renderGroupList("recent-updates-list", "recent-updates-section", recent, "nc-ring-unviewed");
  await renderGroupList("viewed-updates-list", "viewed-updates-section", viewed, "nc-ring-viewed");
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

// --- Onglet Marketplace (boutiques, produits, commandes) ---
let shopsCache = [];
let productsCache = [];
let userLocation = null;
let cart = null; // { shopId, shopName, items: Map<productId, {product, qty}> }

function shopLogoHtml(shop) {
  if (shop?.logoUrl) return `<img src="${shop.logoUrl}" class="nc-avatar-img" />`;
  const initial = (shop?.name || "?").charAt(0).toUpperCase();
  return `<div class="nc-avatar-fallback">${initial}</div>`;
}

function cartCount() {
  if (!cart) return 0;
  let n = 0;
  cart.items.forEach(it => { n += it.qty; });
  return n;
}

async function renderListingsTab() {
  showTabbar();
  tabContent.innerHTML = `
    <h1 class="nc-page-title">Marketplace</h1>
    <div class="nc-status-actions">
      <button id="btn-my-shop" class="nc-btn-primary nc-btn-half">Vendre</button>
      <button id="btn-my-orders" class="nc-btn-secondary nc-btn-half">Acheter</button>
    </div>
    <input id="product-search" type="text" placeholder="Rechercher un produit..." class="nc-search-input" />
    <div class="nc-listing-filter-row">
      <button id="btn-use-location" class="nc-btn-link">Utiliser ma position</button>
      <div id="radius-wrap" class="nc-radius-wrap" hidden>
        <input id="radius-range" type="range" min="1" max="120" value="30" class="nc-radius-range" />
        <span id="radius-value" class="nc-radius-value">30 km</span>
      </div>
    </div>
    <div id="market-grid" class="nc-listings-grid"></div>
    <div id="cart-bar" class="nc-cart-bar" hidden></div>
  `;

  document.getElementById("btn-my-shop").onclick = renderMyShopTab;
  document.getElementById("btn-my-orders").onclick = renderMyOrdersTab;

  document.getElementById("btn-use-location").onclick = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById("radius-wrap").hidden = false;
        applyMarketFilters();
      },
      () => notify("Impossible de récupérer ta position.")
    );
  };
  document.getElementById("product-search").oninput = applyMarketFilters;
  document.getElementById("radius-range").oninput = e => {
    document.getElementById("radius-value").textContent = `${e.target.value} km`;
    applyMarketFilters();
  };

  renderCartBar();

  [shopsCache, productsCache] = await Promise.all([listShops(), listProducts()]);
  applyMarketFilters();
}

function applyMarketFilters() {
  const searchEl = document.getElementById("product-search");
  const radiusEl = document.getElementById("radius-range");
  const radiusWrap = document.getElementById("radius-wrap");
  if (!searchEl) return;
  const term = searchEl.value.trim().toLowerCase();
  const radius = (userLocation && radiusWrap && !radiusWrap.hidden) ? parseFloat(radiusEl.value) : null;

  if (term) {
    let matches = productsCache.filter(p => p.name.toLowerCase().includes(term));
    if (radius) {
      matches = matches.filter(p =>
        p.shopLat != null && p.shopLng != null &&
        distanceKm(userLocation.lat, userLocation.lng, p.shopLat, p.shopLng) <= radius
      );
    }
    renderProductGrid(matches, null);
  } else {
    let shops = shopsCache;
    if (radius) {
      shops = shops.filter(s =>
        s.lat != null && s.lng != null &&
        distanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng) <= radius
      );
    }
    renderShopGrid(shops);
  }
}

function renderShopGrid(shops) {
  const grid = document.getElementById("market-grid");
  if (!grid) return;
  if (!shops.length) {
    grid.innerHTML = `<p class="nc-placeholder">Aucune boutique trouvée dans cette zone.</p>`;
    return;
  }
  grid.innerHTML = shops.map(s => `
    <div class="nc-shop-card" data-id="${s.id}">
      <div class="nc-shop-card-banner">${shopLogoHtml(s)}</div>
      <div class="nc-listing-info">
        <div class="nc-listing-title">${escapeHtml(s.name)}</div>
        ${s.description ? `<div class="nc-listing-city">${escapeHtml(s.description)}</div>` : ""}
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".nc-shop-card").forEach(card => {
    card.onclick = () => openShopDetail(shops.find(s => s.id === card.dataset.id));
  });
}

// originShop : la boutique d'où vient le produit (pour le bouton retour),
// ou null si le produit a été ouvert depuis les résultats de recherche.
function renderProductGrid(products, originShop) {
  const grid = document.getElementById("market-grid") || document.getElementById("shop-products-grid");
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = `<p class="nc-placeholder">Aucun produit trouvé.</p>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="nc-listing-card" data-id="${p.id}">
      ${p.photoUrl ? `<img src="${p.photoUrl}" class="nc-listing-photo" />` : `<div class="nc-listing-photo nc-listing-photo-empty"></div>`}
      <div class="nc-listing-info">
        <div class="nc-listing-title">${escapeHtml(p.name)}</div>
        <div class="nc-listing-price">${p.price} ${p.currency}</div>
        <div class="nc-listing-city">${escapeHtml(p.shopName || "")}${p.stock === 0 ? " · Épuisé" : ""}</div>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".nc-listing-card").forEach(card => {
    card.onclick = () => openProductDetail(products.find(p => p.id === card.dataset.id), originShop);
  });
}

async function openShopDetail(shop) {
  hideTabbar();
  const me = auth.currentUser.uid;
  const isMine = shop.ownerUid === me;
  tabContent.innerHTML = `
    <button id="btn-back-market" class="nc-btn-back">←</button>
    <div class="nc-shop-hero">
      <div class="nc-shop-hero-decor"></div>
      <div class="nc-avatar-large nc-avatar-xl">${shopLogoHtml(shop)}</div>
      <h2 class="nc-profile-hero-name">${escapeHtml(shop.name)}</h2>
      ${shop.description ? `<p class="nc-profile-hero-bio">${escapeHtml(shop.description)}</p>` : ""}
      ${shop.phone ? `<p class="nc-listing-detail-city">${escapeHtml(shop.phone)}</p>` : ""}
      ${!isMine ? `<button id="btn-contact-shop" class="nc-btn-secondary nc-btn-inline">Contacter la boutique</button>` : ""}
    </div>
    <div id="shop-products-grid" class="nc-listings-grid"></div>
  `;
  document.getElementById("btn-back-market").onclick = renderListingsTab;

  const contactBtn = document.getElementById("btn-contact-shop");
  if (contactBtn) contactBtn.onclick = async () => {
    const threadId = await startShopThread(shop.ownerUid, me);
    openShopThread(threadId, shop);
  };

  const products = await listProductsByShop(shop.ownerUid);
  renderProductGrid(products, shop);
}

function openProductDetail(product, originShop) {
  hideTabbar();
  tabContent.innerHTML = `
    <button id="btn-back-product" class="nc-btn-back">←</button>
    <div class="nc-listing-detail">
      ${product.photoUrl ? `<img src="${product.photoUrl}" class="nc-listing-detail-photo" />` : ""}
      <h2>${escapeHtml(product.name)}</h2>
      <p class="nc-listing-detail-price">${product.price} ${product.currency}</p>
      <p class="nc-listing-detail-city">${escapeHtml(product.shopName || "")} · ${product.stock > 0 ? `${product.stock} en stock` : "Épuisé"}</p>
      <p class="nc-listing-detail-desc">${escapeHtml(product.description || "")}</p>
      ${product.stock > 0 ? `
        <div class="nc-qty-row">
          <button id="btn-qty-minus" class="nc-btn-secondary nc-btn-qty" type="button">−</button>
          <span id="qty-value">1</span>
          <button id="btn-qty-plus" class="nc-btn-secondary nc-btn-qty" type="button">+</button>
        </div>
        <button id="btn-add-cart" class="nc-btn-primary nc-btn-inline">Ajouter au panier</button>
      ` : `<button class="nc-btn-secondary nc-btn-inline" disabled>Épuisé</button>`}
    </div>
  `;
  document.getElementById("btn-back-product").onclick = () => {
    if (originShop) openShopDetail(originShop);
    else renderListingsTab();
  };

  if (product.stock > 0) {
    let qty = 1;
    const qtyValueEl = document.getElementById("qty-value");
    document.getElementById("btn-qty-minus").onclick = () => { if (qty > 1) { qty--; qtyValueEl.textContent = qty; } };
    document.getElementById("btn-qty-plus").onclick = () => { if (qty < product.stock) { qty++; qtyValueEl.textContent = qty; } };
    document.getElementById("btn-add-cart").onclick = async () => {
      await addToCart(product, qty);
    };
  }
}

async function addToCart(product, qty) {
  if (cart && cart.shopId !== product.shopId) {
    const ok = await confirmDialog("Ton panier contient des articles d'une autre boutique. Le vider pour ajouter celui-ci ?");
    if (!ok) return;
    cart = null;
  }
  if (!cart) cart = { shopId: product.shopId, shopName: product.shopName, items: new Map() };
  const existing = cart.items.get(product.id);
  const newQty = Math.min(product.stock, (existing?.qty || 0) + qty);
  cart.items.set(product.id, { product, qty: newQty });
  renderCartBar();
  await notify(`${product.name} ajouté au panier.`);
}

function renderCartBar() {
  const bar = document.getElementById("cart-bar");
  if (!bar) return;
  const count = cartCount();
  if (!cart || count === 0) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<button id="btn-open-cart" class="nc-btn-primary nc-btn-inline">Panier (${count}) — voir</button>`;
  document.getElementById("btn-open-cart").onclick = openCart;
}

function openCart() {
  if (!cart || cartCount() === 0) { renderListingsTab(); return; }
  hideTabbar();
  const items = [...cart.items.values()];
  const total = items.reduce((sum, it) => sum + it.product.price * it.qty, 0);
  tabContent.innerHTML = `
    <button id="btn-back-cart" class="nc-btn-back">←</button>
    <h2 class="nc-settings-title">Panier — ${escapeHtml(cart.shopName || "")}</h2>
    <div id="cart-items">
      ${items.map(it => `
        <div class="nc-chat-list-row" data-id="${it.product.id}">
          <div class="nc-chat-list-info">
            <div class="nc-chat-list-name">${escapeHtml(it.product.name)}</div>
            <div class="nc-chat-list-preview">${it.qty} × ${it.product.price} ${it.product.currency}</div>
          </div>
          <button class="nc-btn-small nc-btn-decline" data-action="remove" data-id="${it.product.id}">Retirer</button>
        </div>
      `).join("")}
    </div>
    <p class="nc-listing-detail-price">Total : ${total} ${items[0]?.product.currency || ""}</p>
    <button id="btn-checkout" class="nc-btn-primary nc-btn-inline">Valider la commande</button>
  `;
  document.getElementById("btn-back-cart").onclick = renderListingsTab;
  document.getElementById("cart-items").onclick = e => {
    if (e.target.dataset.action === "remove") {
      cart.items.delete(e.target.dataset.id);
      if (cartCount() === 0) cart = null;
      openCart();
    }
  };
  document.getElementById("btn-checkout").onclick = async () => {
    try {
      const shopId = cart.shopId;
      const orderItems = items.map(it => ({ productId: it.product.id, qty: it.qty }));
      await placeOrder(shopId, orderItems);
      cart = null;
      await notify("Commande passée avec succès !");
      renderMyOrdersTab();
    } catch (err) {
      await notify("Échec de la commande : " + err.message);
    }
  };
}

function orderStatusLabel(status) {
  return {
    pending: "En attente",
    confirmed: "Confirmée",
    shipped: "Expédiée",
    completed: "Terminée",
    cancelled: "Annulée"
  }[status] || status;
}

async function renderMyOrdersTab() {
  hideTabbar();
  const orders = await listMyOrders();
  tabContent.innerHTML = `
    <button id="btn-back-market" class="nc-btn-back">←</button>
    <h2 class="nc-settings-title">Mes commandes</h2>
    <div id="orders-list"></div>
  `;
  document.getElementById("btn-back-market").onclick = renderListingsTab;
  const list = document.getElementById("orders-list");
  if (!orders.length) {
    list.innerHTML = `<p class="nc-placeholder">Aucune commande pour l'instant.</p>`;
    return;
  }
  const sorted = [...orders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  list.innerHTML = sorted.map(o => `
    <div class="nc-chat-list-row">
      <div class="nc-chat-list-info">
        <div class="nc-chat-list-name">${escapeHtml(o.items.map(i => i.name).join(", "))}</div>
        <div class="nc-chat-list-preview">${o.total} ${o.currency} · ${orderStatusLabel(o.status)}</div>
      </div>
    </div>
  `).join("");
}

async function renderMyShopTab() {
  const shop = await getMyShop();
  if (!shop) {
    openShopForm(null);
    return;
  }
  hideTabbar();
  const [products, orders] = await Promise.all([listMyProducts(), listShopOrders()]);
  tabContent.innerHTML = `
    <button id="btn-back-market" class="nc-btn-back">←</button>
    <div class="nc-shop-hero">
      <div class="nc-shop-hero-decor"></div>
      <div class="nc-avatar-large nc-avatar-xl">${shopLogoHtml(shop)}</div>
      <h2 class="nc-profile-hero-name">${escapeHtml(shop.name)}</h2>
      <button id="btn-edit-shop" class="nc-profile-hero-link">Modifier ma boutique →</button>
    </div>
    <div class="nc-status-actions">
      <button id="btn-add-product" class="nc-btn-primary nc-btn-half">Ajouter un produit</button>
      <button id="btn-shop-orders" class="nc-btn-secondary nc-btn-half">Commandes reçues (${orders.length})</button>
    </div>
    <h3 class="nc-section-title">Mon catalogue</h3>
    <div id="my-products-grid" class="nc-listings-grid"></div>
  `;
  document.getElementById("btn-back-market").onclick = renderListingsTab;
  document.getElementById("btn-edit-shop").onclick = () => openShopForm(shop);
  document.getElementById("btn-add-product").onclick = () => openProductForm(null);
  document.getElementById("btn-shop-orders").onclick = () => renderShopOrdersTab(orders);

  const grid = document.getElementById("my-products-grid");
  if (!products.length) {
    grid.innerHTML = `<p class="nc-placeholder">Pas encore de produit. Ajoute ton premier article.</p>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="nc-listing-card" data-id="${p.id}">
      ${p.photoUrl ? `<img src="${p.photoUrl}" class="nc-listing-photo" />` : `<div class="nc-listing-photo nc-listing-photo-empty"></div>`}
      <div class="nc-listing-info">
        <div class="nc-listing-title">${escapeHtml(p.name)}</div>
        <div class="nc-listing-price">${p.price} ${p.currency}</div>
        <div class="nc-listing-city">${p.stock > 0 ? `${p.stock} en stock` : "Épuisé"}</div>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".nc-listing-card").forEach(card => {
    card.onclick = () => openProductForm(products.find(p => p.id === card.dataset.id));
  });
}

function openShopForm(shop) {
  hideTabbar();
  tabContent.innerHTML = `
    <button id="btn-back-shop-form" class="nc-btn-back">←</button>
    <div class="nc-listing-form">
      <input id="shop-name" type="text" placeholder="Nom de la boutique" class="nc-search-input" value="${shop ? escapeHtml(shop.name) : ""}" />
      <textarea id="shop-desc" placeholder="Description" class="nc-bio-textarea">${shop ? escapeHtml(shop.description || "") : ""}</textarea>
      <input id="shop-phone" type="tel" placeholder="Numéro de téléphone" class="nc-search-input" value="${shop ? escapeHtml(shop.phone || "") : ""}" />
      <button id="btn-shop-location" class="nc-btn-link">Utiliser ma position actuelle</button>
      <input type="file" id="shop-logo" accept="image/*" class="nc-search-input" />
      <button id="btn-save-shop" class="nc-btn-primary nc-btn-inline">${shop ? "Enregistrer" : "Créer ma boutique"}</button>
      <p class="nc-auth-error" id="shop-form-error"></p>
    </div>
  `;
  document.getElementById("btn-back-shop-form").onclick = shop ? renderMyShopTab : renderListingsTab;

  let coords = shop ? { lat: shop.lat, lng: shop.lng } : null;
  document.getElementById("btn-shop-location").onclick = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        notify("Position enregistrée pour la boutique.");
      },
      () => notify("Impossible de récupérer ta position.")
    );
  };

  document.getElementById("btn-save-shop").onclick = async () => {
    const name = document.getElementById("shop-name").value.trim();
    const description = document.getElementById("shop-desc").value.trim();
    const phone = document.getElementById("shop-phone").value.trim();
    const logoFile = document.getElementById("shop-logo").files[0] || null;
    const errEl = document.getElementById("shop-form-error");
    errEl.textContent = "";
    if (!name || !phone) {
      errEl.textContent = "Le nom et le numéro de téléphone sont obligatoires.";
      return;
    }
    if (!coords || coords.lat == null) {
      errEl.textContent = "Merci d'activer ta position pour que les acheteurs puissent te trouver.";
      return;
    }
    try {
      await createOrUpdateShop({ name, description, phone, logoFile, lat: coords.lat, lng: coords.lng });
      renderMyShopTab();
    } catch (err) {
      errEl.textContent = "Échec : " + err.message;
    }
  };
}

function openProductForm(product) {
  hideTabbar();
  tabContent.innerHTML = `
    <button id="btn-back-product-form" class="nc-btn-back">←</button>
    <div class="nc-listing-form">
      <input id="product-name" type="text" placeholder="Nom du produit" class="nc-search-input" value="${product ? escapeHtml(product.name) : ""}" />
      <textarea id="product-desc" placeholder="Description" class="nc-bio-textarea">${product ? escapeHtml(product.description || "") : ""}</textarea>
      <div class="nc-listing-form-row">
        <input id="product-price" type="number" placeholder="Prix" class="nc-search-input" value="${product ? product.price : ""}" />
        <select id="product-currency" class="nc-radius-select">
          <option value="XOF" ${!product || product.currency === "XOF" ? "selected" : ""}>XOF</option>
          <option value="EUR" ${product?.currency === "EUR" ? "selected" : ""}>EUR</option>
          <option value="USD" ${product?.currency === "USD" ? "selected" : ""}>USD</option>
        </select>
      </div>
      <input id="product-stock" type="number" min="0" placeholder="Quantité en stock" class="nc-search-input" value="${product ? product.stock : ""}" />
      <input type="file" id="product-photo" accept="image/*" class="nc-search-input" />
      <button id="btn-save-product" class="nc-btn-primary nc-btn-inline">${product ? "Enregistrer" : "Ajouter le produit"}</button>
      ${product ? `<button id="btn-delete-product" class="nc-btn-secondary nc-btn-inline nc-btn-danger-outline">Supprimer le produit</button>` : ""}
      <p class="nc-auth-error" id="product-form-error"></p>
    </div>
  `;
  document.getElementById("btn-back-product-form").onclick = renderMyShopTab;

  document.getElementById("btn-save-product").onclick = async () => {
    const name = document.getElementById("product-name").value.trim();
    const description = document.getElementById("product-desc").value.trim();
    const price = document.getElementById("product-price").value;
    const currency = document.getElementById("product-currency").value;
    const stock = document.getElementById("product-stock").value;
    const photoFile = document.getElementById("product-photo").files[0] || null;
    const errEl = document.getElementById("product-form-error");
    errEl.textContent = "";
    if (!name || price === "" || stock === "") {
      errEl.textContent = "Le nom, le prix et la quantité sont obligatoires.";
      return;
    }
    try {
      if (product) {
        await updateProduct(product.id, { name, description, price, currency, stock, photoFile });
      } else {
        await createProduct({ name, description, price, currency, stock, photoFile });
      }
      renderMyShopTab();
    } catch (err) {
      errEl.textContent = "Échec : " + err.message;
    }
  };

  const delBtn = document.getElementById("btn-delete-product");
  if (delBtn) delBtn.onclick = async () => {
    if (await confirmDialog("Supprimer ce produit ?")) {
      await deleteProduct(product.id);
      renderMyShopTab();
    }
  };
}

function renderShopOrdersTab(orders) {
  hideTabbar();
  tabContent.innerHTML = `
    <button id="btn-back-my-shop" class="nc-btn-back">←</button>
    <h2 class="nc-settings-title">Commandes reçues</h2>
    <div id="shop-orders-list"></div>
  `;
  document.getElementById("btn-back-my-shop").onclick = renderMyShopTab;
  const list = document.getElementById("shop-orders-list");
  if (!orders.length) {
    list.innerHTML = `<p class="nc-placeholder">Aucune commande reçue pour l'instant.</p>`;
    return;
  }
  const sorted = [...orders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  list.innerHTML = sorted.map(o => `
    <div class="nc-chat-list-row" data-id="${o.id}">
      <div class="nc-chat-list-info">
        <div class="nc-chat-list-name">${escapeHtml(o.items.map(i => `${i.qty}× ${i.name}`).join(", "))}</div>
        <div class="nc-chat-list-preview">${o.total} ${o.currency} · ${orderStatusLabel(o.status)}</div>
      </div>
      ${o.status !== "completed" && o.status !== "cancelled" ? `
        <select class="nc-radius-select" data-order="${o.id}">
          <option value="pending" ${o.status === "pending" ? "selected" : ""}>En attente</option>
          <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>Confirmée</option>
          <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Expédiée</option>
          <option value="completed" ${o.status === "completed" ? "selected" : ""}>Terminée</option>
          <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>Annulée</option>
        </select>
      ` : ""}
    </div>
  `).join("");
  list.querySelectorAll("select[data-order]").forEach(sel => {
    sel.onchange = async () => {
      await updateOrderStatus(sel.dataset.order, sel.value);
      await notify("Statut de la commande mis à jour.");
    };
  });
}

// --- Messagerie boutique/acheteur ---
function buildShopMessagesHtml(messages, me) {
  let html = "";
  let lastDateKey = null;
  messages.forEach(m => {
    const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
    const dateKey = date.toDateString();
    if (dateKey !== lastDateKey) {
      html += `<div class="nc-date-separator"><span>${formatDaySeparator(date)}</span></div>`;
      lastDateKey = dateKey;
    }
    const mine = m.senderUid === me;
    const bubbleClass = mine ? "nc-bubble nc-bubble-mine" : "nc-bubble nc-bubble-other";
    let content = "";
    if (m.mediaUrl) {
      content += m.mediaType === "video"
        ? `<video src="${m.mediaUrl}" controls class="nc-bubble-media"></video>`
        : `<img src="${m.mediaUrl}" class="nc-bubble-media" />`;
    }
    if (m.text) content += `<div class="nc-bubble-text">${linkify(escapeHtml(m.text))}</div>`;
    html += `<div class="${bubbleClass}">${content}<div class="nc-bubble-meta"><span class="nc-bubble-time">${formatTime(date)}</span></div></div>`;
  });
  return html;
}

async function openShopThread(threadId, headerLabel) {
  hideTabbar();
  clearActiveListeners();
  const me = auth.currentUser.uid;
  tabContent.innerHTML = `
    <div class="nc-thread">
      <div class="nc-thread-header">
        <button id="btn-back-shop-thread" class="nc-icon-btn nc-btn-back">${iconBack()}</button>
        <div class="nc-thread-header-info">
          <span class="nc-thread-title">${escapeHtml(headerLabel?.name || "Messagerie boutique")}</span>
        </div>
      </div>
      <div id="thread-messages" class="nc-thread-messages"></div>
      <div class="nc-thread-input-bar">
        <input type="file" id="thread-media-input" accept="image/*,video/*" hidden />
        <button id="btn-attach" class="nc-icon-btn nc-btn-attach" type="button">${iconAttach()}</button>
        <input id="thread-text-input" type="text" placeholder="Écrire un message..." class="nc-thread-input" />
        <button id="btn-send" class="nc-btn-send-round" type="button">${iconSend()}</button>
      </div>
    </div>
  `;
  document.getElementById("btn-back-shop-thread").onclick = () => {
    clearActiveListeners();
    renderListingsTab();
  };

  const messagesEl = document.getElementById("thread-messages");
  const unsub = listenToShopMessages(threadId, messages => {
    if (!document.getElementById("thread-messages")) return;
    messagesEl.innerHTML = buildShopMessagesHtml(messages, me);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
  activeUnsubscribers.push(unsub);

  document.getElementById("btn-send").onclick = async () => {
    const input = document.getElementById("thread-text-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await sendShopMessage(threadId, { text });
  };

  document.getElementById("btn-attach").onclick = () => {
    document.getElementById("thread-media-input").click();
  };
  document.getElementById("thread-media-input").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url, type } = await uploadMedia(file);
      await sendShopMessage(threadId, { mediaUrl: url, mediaType: type });
    } catch (err) {
      await notify("Échec de l'envoi du média : " + err.message);
    }
    e.target.value = "";
  };
}

function renderShopMessagesTab() {
  showTabbar();
  tabContent.innerHTML = `
    <h1 class="nc-page-title">Messages boutique</h1>
    <div id="shop-threads-list"></div>
  `;
  const me = auth.currentUser.uid;
  const unsub = listenToMyShopThreads(async threads => {
    const list = document.getElementById("shop-threads-list");
    if (!list) return;
    if (!threads.length) {
      list.innerHTML = `<p class="nc-placeholder">Aucun message pour l'instant.</p>`;
      return;
    }
    const rows = await Promise.all(threads.map(async t => {
      const isSeller = t.shopId === me;
      const otherUid = isSeller ? t.buyerUid : t.shopId;
      const other = isSeller ? await getPublicProfile(otherUid) : await getShop(otherUid);
      const label = isSeller ? (other?.username || "Acheteur") : (other?.name || "Boutique");
      const date = t.lastMessageAt?.toDate ? t.lastMessageAt.toDate() : null;
      return `
        <div class="nc-chat-list-row" data-thread="${t.id}" data-label="${escapeHtml(label)}">
          <div class="nc-chat-list-info">
            <div class="nc-chat-list-name">${escapeHtml(label)}</div>
            <div class="nc-chat-list-preview">${escapeHtml(t.lastMessage || "Nouvelle conversation")}</div>
          </div>
          <div class="nc-chat-list-time">${date ? formatTime(date) : ""}</div>
        </div>
      `;
    }));
    list.innerHTML = rows.join("");
    list.querySelectorAll(".nc-chat-list-row").forEach(row => {
      row.onclick = () => openShopThread(row.dataset.thread, { name: row.dataset.label });
    });
  });
  activeUnsubscribers.push(unsub);
}

async function renderSearchTab() {
  showTabbar();
  tabContent.innerHTML = `
    <h1 class="nc-page-title">NexChat</h1>
    <div class="nc-search-pill">
      ${iconSearch()}
      <input id="search-input" type="text" placeholder="Rechercher par nom d'utilisateur" />
    </div>
    <div id="search-results"></div>
    <div id="friends-section">
      <h4 class="nc-status-group-label">Demandes d'amis reçues</h4>
      <div id="friend-requests-list"></div>
      <h4 class="nc-status-group-label">Mes amis</h4>
      <div id="friends-list"></div>
    </div>
  `;
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const friendsSection = document.getElementById("friends-section");
  const friendsList = document.getElementById("friends-list");

  async function loadFriendRequests() {
    const requests = await listFriendRequests();
    const requestsList = document.getElementById("friend-requests-list");
    if (!requests.length) {
      requestsList.innerHTML = `<p class="nc-placeholder">Aucune demande en attente.</p>`;
      return;
    }
    const senderProfiles = await Promise.all(requests.map(r => getPublicProfile(r.from)));
    requestsList.innerHTML = requests.map((r, i) => `
      <div class="nc-chat-list-row">
        <div class="nc-avatar-medium nc-ring-none">${avatarHtml(senderProfiles[i])}</div>
        <div class="nc-chat-list-info">
          <div class="nc-chat-list-name">${escapeHtml(senderProfiles[i]?.username || "Utilisateur")}</div>
        </div>
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
      loadFriendRequests();
      loadFriendsList();
    };
  }
  loadFriendRequests();

  async function loadFriendsList() {
    const me = auth.currentUser.uid;
    const friendUids = await listFriends(me);
    if (!friendUids.length) {
      friendsList.innerHTML = `<p class="nc-placeholder">Pas encore d'amis. Utilise la recherche pour en ajouter.</p>`;
      return;
    }
    const profiles = await Promise.all(friendUids.map(uid => getPublicProfile(uid)));
    friendsList.innerHTML = friendUids.map((uid, i) => `
      <div class="nc-chat-list-row" data-uid="${uid}">
        <div class="nc-avatar-medium nc-ring-none">${avatarHtml(profiles[i])}</div>
        <div class="nc-chat-list-info">
          <div class="nc-chat-list-name">${escapeHtml(profiles[i]?.username || "Utilisateur")}</div>
          ${profiles[i]?.bio ? `<div class="nc-chat-list-preview">${escapeHtml(profiles[i].bio)}</div>` : ""}
        </div>
      </div>
    `).join("");
    friendsList.querySelectorAll(".nc-chat-list-row[data-uid]").forEach(row => {
      row.onclick = () => openPublicProfile(row.dataset.uid);
    });
  }
  loadFriendsList();

  input.oninput = async () => {
    const term = input.value.trim();
    if (!term) {
      results.innerHTML = "";
      friendsSection.hidden = false;
      return;
    }
    friendsSection.hidden = true;
    const users = await searchUsersByUsername(term);
    results.innerHTML = users.map(u => `
      <div class="nc-chat-list-row">
        <div class="nc-avatar-medium nc-ring-none">${avatarHtml(u)}</div>
        <div class="nc-chat-list-info">
          <div class="nc-chat-list-name" data-action="view" data-uid="${u.uid}">${escapeHtml(u.username)}</div>
        </div>
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
  hideTabbar();
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
  showTabbar();
  tabContent.innerHTML = `
    <h1 class="nc-page-title">NexChat</h1>
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
    const sorted = [...groups].sort((a, b) => {
      const at = a.lastMessageAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bt = b.lastMessageAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bt - at;
    });
    list.innerHTML = sorted.map(g => {
      const date = g.lastMessageAt?.toDate ? g.lastMessageAt.toDate() : null;
      const preview = g.lastMessage || `${g.memberUids.length} membre(s)`;
      return `
        <div class="nc-chat-list-row" data-group="${g.id}">
          <div class="nc-avatar-medium">${avatarHtml({ photoURL: g.photoURL, username: g.name })}</div>
          <div class="nc-chat-list-info">
            <div class="nc-chat-list-name">${escapeHtml(g.name)}</div>
            <div class="nc-chat-list-preview">${escapeHtml(preview)}</div>
          </div>
          <div class="nc-chat-list-time">${date ? formatTime(date) : ""}</div>
        </div>
      `;
    }).join("") || `<p class="nc-placeholder">Aucun groupe pour l'instant.</p>`;
    list.querySelectorAll(".nc-chat-list-row").forEach(row => {
      row.onclick = () => openGroupThread(row.dataset.group);
    });
  });
  activeUnsubscribers.push(unsub);
}

async function openGroupThread(groupId) {
  hideTabbar();
  clearActiveListeners();
  const group = await getGroup(groupId);
  const memberProfiles = await Promise.all(group.memberUids.map(uid => getPublicProfile(uid)));
  const memberNames = {};
  group.memberUids.forEach((uid, i) => { memberNames[uid] = memberProfiles[i]?.username || "Utilisateur"; });

  tabContent.innerHTML = `
    <div class="nc-thread">
      <div class="nc-thread-header">
        <button id="btn-back-groups" class="nc-icon-btn nc-btn-back" type="button">${iconBack()}</button>
        <span class="nc-thread-title nc-thread-title-group">${escapeHtml(group.name)}</span>
        <button id="btn-add-member" class="nc-btn-add-member" type="button">Ajouter</button>
      </div>
      <div id="thread-messages" class="nc-thread-messages"></div>
      <div class="nc-thread-input-bar">
        <input type="file" id="thread-media-input" accept="image/*,video/*" hidden />
        <button id="btn-attach" class="nc-icon-btn nc-btn-attach" type="button">${iconAttach()}</button>
        <input id="thread-text-input" type="text" placeholder="Écrire un message..." class="nc-thread-input" />
        <button id="btn-send" class="nc-btn-send-round" type="button">${iconSend()}</button>
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
  const rowClass = mine ? "nc-msg-row nc-msg-row-mine" : "nc-msg-row nc-msg-row-other";
  const date = message.createdAt?.toDate ? message.createdAt.toDate() : null;
  let content = "";
  if (!mine) {
    content += `<div class="nc-bubble-sender">${escapeHtml(memberNames[message.senderUid] || "Utilisateur")}</div>`;
  }
  if (message.mediaUrl) {
    content += message.mediaType === "video"
      ? `<video src="${message.mediaUrl}" controls class="nc-bubble-media"></video>`
      : `<img src="${message.mediaUrl}" class="nc-bubble-media" />`;
  }
  if (message.text) {
    content += `<div class="nc-bubble-text">${linkify(escapeHtml(message.text))}</div>`;
  }
  return `
    <div class="${rowClass}">
      <div class="${bubbleClass}">${content}</div>
      <div class="nc-bubble-footer">
        <div class="nc-bubble-meta">
          <span class="nc-bubble-time">${date ? formatTime(date) : ""}</span>
        </div>
      </div>
    </div>
  `;
}

// --- Onglet Profil ---
async function renderProfileTab() {
  showTabbar();
  const profile = await getUserProfile(auth.currentUser.uid);
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.username || "";

  tabContent.innerHTML = `
    <div class="nc-profile-hero">
      <div class="nc-profile-hero-decor"></div>
      <div class="nc-profile-hero-photo">
        <div class="nc-avatar-large nc-avatar-xl" id="btn-view-photo">${avatarHtml(profile)}</div>
        <button id="btn-change-photo" class="nc-avatar-edit-badge">${iconCamera()}</button>
      </div>
      <div class="nc-profile-hero-info">
        <h2 class="nc-profile-hero-name">${escapeHtml(fullName)}</h2>
        ${profile?.phoneNumber ? `<p class="nc-profile-hero-phone">${escapeHtml(profile.phoneNumber)}</p>` : ""}
        <p class="nc-profile-hero-bio">${profile?.bio ? escapeHtml(profile.bio) : "Aucune bio pour l'instant."}</p>
        <button id="btn-edit-profile" class="nc-profile-hero-link">Modifier mon profil →</button>
      </div>
    </div>
  `;

  document.getElementById("btn-edit-profile").onclick = async () => {
    const result = await editProfileDialog(profile);
    if (result) {
      await updateOwnProfile(result);
      renderProfileTab();
    }
  };

  if (profile?.photoURL) {
    document.getElementById("btn-view-photo").onclick = () => {
      openFullPhotoViewer(profile.photoFullURL || profile.photoURL);
    };
  }

  document.getElementById("btn-change-photo").onclick = async () => {
    const result = await openPhotoUploadDialog(avatarHtml(profile), uploadMediaWithProgress);
    if (result) {
      try {
        await updateOwnProfile({ photoURL: result.url, photoFullURL: result.fullUrl });
        renderProfileTab();
      } catch (err) {
        await notify("Échec de la mise à jour du profil : " + err.message);
      }
    }
  };
}

function openFullPhotoViewer(url) {
  const overlay = document.createElement("div");
  overlay.className = "nc-photo-viewer-overlay";
  overlay.innerHTML = `
    <button class="nc-photo-viewer-close">${iconClose()}</button>
    <img src="${url}" class="nc-photo-viewer-img" />
  `;
  overlay.querySelector(".nc-photo-viewer-close").onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// --- Onglet Paramètres ---
async function renderSettingsTab() {
  showTabbar();
  const profile = await getUserProfile(auth.currentUser.uid);
  tabContent.innerHTML = `
    <h2 class="nc-settings-title">Paramètres</h2>

    <h3 class="nc-section-title">Compte</h3>
    <div class="nc-settings-row">
      <div>
        <div class="nc-settings-row-label">Adresse email</div>
        <div class="nc-settings-row-value">${profile?.email || ""}</div>
      </div>
    </div>
    <button id="btn-reset-password" class="nc-btn-secondary nc-btn-inline">Changer le mot de passe</button>

    <h3 class="nc-section-title">Session</h3>
    <button id="btn-settings-logout" class="nc-btn-secondary nc-btn-inline nc-btn-danger-outline">Se déconnecter</button>
  `;

  document.getElementById("btn-reset-password").onclick = async () => {
    if (!profile?.email) return;
    try {
      await sendPasswordResetEmail(auth, profile.email);
      await notify(`Un lien de réinitialisation a été envoyé à ${profile.email}.`);
    } catch (err) {
      await notify("Échec de l'envoi : " + err.message);
    }
  };

  document.getElementById("btn-settings-logout").onclick = () => signOut(auth);
}

// --- Appels audio/vidéo ---
let activeCallHandle = null;

async function initiateCall(otherUser, type) {
  if (activeCallHandle) {
    await notify("Un appel est déjà en cours.");
    return;
  }
  let handle;
  try {
    handle = await startCall(otherUser.uid, type);
  } catch (err) {
    await notify("Impossible d'accéder au micro/caméra : " + err.message);
    return;
  }
  activeCallHandle = handle;
  openActiveCallScreen(handle, otherUser, type, "calling");
}

function showIncomingCallScreen(callData) {
  if (activeCallHandle) {
    // Déjà en communication : on décline automatiquement le nouvel appel.
    declineCall(callData.id);
    return;
  }

  (async () => {
    const callerProfile = await getPublicProfile(callData.callerUid);
    const overlay = document.createElement("div");
    overlay.className = "nc-call-overlay";
    overlay.innerHTML = `
      <div class="nc-avatar-large">${avatarHtml(callerProfile)}</div>
      <p class="nc-call-name">${callerProfile?.username || "Appel entrant"}</p>
      <p class="nc-call-status">${callData.type === "video" ? "Appel vidéo entrant..." : "Appel audio entrant..."}</p>
      <div class="nc-call-incoming-actions">
        <button id="btn-decline-call" class="nc-btn-call-decline">Refuser</button>
        <button id="btn-accept-call" class="nc-btn-call-accept">Accepter</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("btn-decline-call").onclick = async () => {
      await declineCall(callData.id);
      overlay.remove();
    };
    document.getElementById("btn-accept-call").onclick = async () => {
      overlay.remove();
      try {
        const handle = await answerCall(callData);
        activeCallHandle = handle;
        openActiveCallScreen(handle, callerProfile, callData.type, "connected");
      } catch (err) {
        await notify("Impossible d'accéder au micro/caméra : " + err.message);
      }
    };
  })();
}

function openActiveCallScreen(handle, otherUser, type, initialState) {
  const overlay = document.createElement("div");
  overlay.className = "nc-call-overlay";
  overlay.innerHTML = `
    ${type === "video" ? `
      <video id="nc-remote-video" class="nc-remote-video" autoplay playsinline></video>
      <video id="nc-local-video" class="nc-local-video" autoplay playsinline muted></video>
    ` : `
      <div class="nc-avatar-large">${avatarHtml(otherUser)}</div>
    `}
    <p class="nc-call-name">${otherUser?.username || "Utilisateur"}</p>
    <p class="nc-call-status" id="nc-call-status">${initialState === "calling" ? "Appel en cours..." : "Connexion..."}</p>
    <audio id="nc-remote-audio" autoplay></audio>
    <div class="nc-call-active-actions">
      <button id="btn-toggle-mute" class="nc-btn-call-mute">Muet</button>
      <button id="btn-hangup" class="nc-btn-call-hangup">Raccrocher</button>
    </div>
  `;
  document.body.appendChild(overlay);

  if (type === "video") {
    document.getElementById("nc-local-video").srcObject = handle.localStream;
    document.getElementById("nc-remote-video").srcObject = handle.remoteStream;
  } else {
    document.getElementById("nc-remote-audio").srcObject = handle.remoteStream;
  }

  let muted = false;
  document.getElementById("btn-toggle-mute").onclick = () => {
    muted = !muted;
    handle.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
    document.getElementById("btn-toggle-mute").textContent = muted ? "Réactiver" : "Muet";
  };

  let timerInterval = null;
  let seconds = 0;
  function startTimer() {
    const statusEl = document.getElementById("nc-call-status");
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      if (statusEl) statusEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  // Bascule "connexion..." -> chrono dès qu'un flux distant arrive.
  handle.remoteStream.onaddtrack = startTimer;
  if (handle.remoteStream.getTracks().length) startTimer();

  function cleanup() {
    clearInterval(timerInterval);
    overlay.remove();
    activeCallHandle = null;
  }

  handle.onEnded(() => cleanup());

  document.getElementById("btn-hangup").onclick = async () => {
    await handle.hangUp();
    cleanup();
  };
}
let incomingCallUnsub = null;

onAuthStateChanged(auth, async user => {
  if (user) {
    authScreen.hidden = true;
    appShell.hidden = false;
    renderTab("chats");
    if (!incomingCallUnsub) {
      incomingCallUnsub = listenForIncomingCalls(showIncomingCallScreen);
    }
  } else {
    appShell.hidden = true;
    authScreen.hidden = false;
    showAuthView("login");
    if (incomingCallUnsub) { incomingCallUnsub(); incomingCallUnsub = null; }
  }
  hideLoader();
});
