// friends.js — Recherche d'utilisateurs par username + gestion des demandes d'amis
//
// Structure Firestore utilisée :
// /users/{uid}                         -> profil (username, displayName, photoURL, bio...)
// /users/{uid}/friends/{friendUid}      -> { status: "accepted", since }
// /users/{uid}/friendRequests/{fromUid} -> { status: "pending", createdAt }

import { db, auth } from "./firebase-config.js?v=42";
import {
  doc, getDoc, setDoc, deleteDoc, query, collection, where, getDocs,
  orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Recherche par préfixe de username (nécessite le champ "username" en minuscules)
export async function searchUsersByUsername(term) {
  const clean = term.trim().toLowerCase();
  if (!clean) return [];
  const q = query(
    collection(db, "users"),
    orderBy("username"),
    where("username", ">=", clean),
    where("username", "<=", clean + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data()).filter(u => u.uid !== auth.currentUser?.uid);
}

export async function getPublicProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  // On ne renvoie jamais l'email sur un profil consulté par un tiers
  const { email, ...publicData } = data;
  return publicData;
}

export async function getFriendshipStatus(otherUid) {
  const me = auth.currentUser.uid;
  if (otherUid === me) return "self";

  const friendSnap = await getDoc(doc(db, `users/${me}/friends/${otherUid}`));
  if (friendSnap.exists()) return "friends";

  const receivedSnap = await getDoc(doc(db, `users/${me}/friendRequests/${otherUid}`));
  if (receivedSnap.exists()) return "pending_received";

  const sentSnap = await getDoc(doc(db, `users/${otherUid}/friendRequests/${me}`));
  if (sentSnap.exists()) return "pending_sent";

  return "none";
}

export async function sendFriendRequest(targetUid) {
  const me = auth.currentUser.uid;
  await setDoc(doc(db, `users/${targetUid}/friendRequests/${me}`), {
    from: me,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

export async function acceptFriendRequest(fromUid) {
  const me = auth.currentUser.uid;
  await setDoc(doc(db, `users/${me}/friends/${fromUid}`), { status: "accepted", since: serverTimestamp() });
  await setDoc(doc(db, `users/${fromUid}/friends/${me}`), { status: "accepted", since: serverTimestamp() });
  await deleteDoc(doc(db, `users/${me}/friendRequests/${fromUid}`));
}

export async function declineFriendRequest(fromUid) {
  const me = auth.currentUser.uid;
  await deleteDoc(doc(db, `users/${me}/friendRequests/${fromUid}`));
}

export async function listFriends(uid) {
  const snap = await getDocs(collection(db, `users/${uid}/friends`));
  return snap.docs.map(d => d.id);
}

export async function listFriendRequests() {
  const me = auth.currentUser.uid;
  const snap = await getDocs(collection(db, `users/${me}/friendRequests`));
  return snap.docs.map(d => d.data());
}
