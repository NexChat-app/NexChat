// app.js — Point d'entrée. Gère la bascule auth <-> app et le routage des onglets.
// Étape 1 : authentification complète + squelette des onglets (Recherche, Groupes, Profil).
// Le contenu détaillé des Discussions (chat 1:1) arrive à l'étape suivante.

import { renderLoader, hideLoader } from "./loader.js?v=3";
import { auth, db } from "./firebase-config.js?v=3";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  requestSignupCode, confirmSignupCode, login, getUserProfile
} from "./auth.js?v=3";
import { searchUsersByUsername, sendFriendRequest, getPublicProfile } from "./friends.js?v=3";
import { createGroup, listenToMyGroups } from "./groups.js?v=3";

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

tabButtons.forEach(btn => {
  btn.onclick = () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderTab(btn.dataset.tab);
  };
});

function renderTab(tab) {
  if (tab === "chats") {
    tabContent.innerHTML = `<p class="nc-placeholder">Les discussions arrivent à l'étape suivante.</p>`;
  } else if (tab === "search") {
    renderSearchTab();
  } else if (tab === "groups") {
    renderGroupsTab();
  } else if (tab === "profile") {
    renderProfileTab();
  }
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
      <div class="nc-user-row" data-uid="${u.uid}">
        <span>${u.username}</span>
        <button class="nc-btn-small" data-action="add" data-uid="${u.uid}">Ajouter</button>
      </div>
    `).join("") || `<p class="nc-placeholder">Aucun résultat.</p>`;
  };
  results.onclick = async e => {
    if (e.target.dataset.action === "add") {
      await sendFriendRequest(e.target.dataset.uid);
      e.target.textContent = "Demande envoyée";
      e.target.disabled = true;
    }
  };
}

function renderGroupsTab() {
  tabContent.innerHTML = `
    <button id="btn-new-group" class="nc-btn-primary nc-btn-inline">Créer un groupe</button>
    <div id="groups-list"></div>
  `;
  document.getElementById("btn-new-group").onclick = async () => {
    const name = prompt("Nom du groupe :");
    if (name) await createGroup(name, []);
  };
  listenToMyGroups(groups => {
    document.getElementById("groups-list").innerHTML = groups.map(g => `
      <div class="nc-group-row">${g.name}</div>
    `).join("") || `<p class="nc-placeholder">Aucun groupe pour l'instant.</p>`;
  });
}

async function renderProfileTab() {
  const profile = await getUserProfile(auth.currentUser.uid);
  tabContent.innerHTML = `
    <div class="nc-profile-block">
      <p class="nc-profile-username">${profile?.username || ""}</p>
      <p class="nc-profile-email">${profile?.email || ""}</p>
      <button id="btn-logout" class="nc-btn-primary nc-btn-inline">Se déconnecter</button>
    </div>
  `;
  document.getElementById("btn-logout").onclick = () => signOut(auth);
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
