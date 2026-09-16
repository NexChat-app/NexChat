// auth.js — Authentification NexChat (refonte)
//
// Nouveau flux d'inscription :
// 1. L'utilisateur saisit email + nom d'utilisateur + mot de passe
// 2. On vérifie que le username est libre (Firestore)
// 3. On demande au backend Render d'envoyer un code à 6 chiffres par email (Brevo)
// 4. L'utilisateur saisit le code reçu
// 5. Le backend vérifie le code -> si OK, le compte Firebase Auth est créé
//    et le document Firestore /users/{uid} est créé avec le username choisi

import { auth, db, BACKEND_URL } from "./firebase-config.js?v=45";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export async function isUsernameAvailable(username) {
  const q = query(collection(db, "usernames"), where("username", "==", username.toLowerCase()));
  const snap = await getDocs(q);
  return snap.empty;
}

export async function requestSignupCode(email, username, password) {
  const cleanUsername = username.trim().toLowerCase();

  if (!USERNAME_REGEX.test(cleanUsername)) {
    throw new Error("Nom d'utilisateur invalide (3-20 caractères, lettres/chiffres/._ uniquement).");
  }
  if (password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  const available = await isUsernameAvailable(cleanUsername);
  if (!available) {
    throw new Error("Ce nom d'utilisateur est déjà pris.");
  }

  const res = await fetch(`${BACKEND_URL}/api/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Impossible d'envoyer le code de vérification.");
  }

  // On garde les infos en mémoire locale le temps de la vérification du code
  sessionStorage.setItem("nc_pending_signup", JSON.stringify({ email, username: cleanUsername, password }));
}

export async function confirmSignupCode(code) {
  const pendingRaw = sessionStorage.getItem("nc_pending_signup");
  if (!pendingRaw) throw new Error("Aucune inscription en attente.");
  const { email, username, password } = JSON.parse(pendingRaw);

  const verifyRes = await fetch(`${BACKEND_URL}/api/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(data.error || "Code invalide ou expiré.");
  }

  // Code validé côté serveur -> on crée réellement le compte.
  // Cas particulier : si un essai précédent avait déjà créé le compte Auth
  // mais échoué avant d'enregistrer le profil Firestore (ex: coupure réseau),
  // on se connecte à ce compte existant au lieu d'échouer, puis on termine
  // la création du profil normalement.
  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    await updateProfile(user, { displayName: username });
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
      const existingProfile = await getDoc(doc(db, "users", user.uid));
      if (existingProfile.exists()) {
        // Le compte et le profil existent déjà réellement : rien à refaire.
        sessionStorage.removeItem("nc_pending_signup");
        return user;
      }
    } else {
      throw err;
    }
  }

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    username,
    email,
    displayName: username,
    photoURL: null,
    bio: "",
    createdAt: serverTimestamp()
  });
  // Table de réservation des usernames, utilisée pour l'unicité + la recherche
  await setDoc(doc(db, "usernames", username), {
    uid: user.uid,
    username
  });

  sessionStorage.removeItem("nc_pending_signup");
  return user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateOwnProfile({ displayName, bio, photoURL, firstName, lastName, phoneNumber }) {
  const uid = auth.currentUser.uid;
  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (photoURL !== undefined) updates.photoURL = photoURL;
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
  await updateDoc(doc(db, "users", uid), updates);
  if (displayName !== undefined || photoURL !== undefined) {
    await updateProfile(auth.currentUser, {
      displayName: displayName ?? auth.currentUser.displayName,
      photoURL: photoURL ?? auth.currentUser.photoURL
    });
  }
}
