// statuses.js — Statuts façon "stories" (texte, photo ou vidéo, expirent après 24h)
//
// Structure Firestore utilisée :
// /statuses/{statusId} -> {
//   authorUid, mediaUrl, mediaType ("image"|"video"|"text"),
//   text, backgroundColor, createdAt, expiresAt (timestamp ms), viewedBy: [uid, ...]
// }
//
// Visibilité : un statut n'est lisible que par son auteur et ses amis
// (voir firestore.rules). Pour éviter les soucis d'index Firestore, on
// interroge par lot d'auteurs autorisés (moi + mes amis) avec un simple
// "where in", puis on filtre les statuts expirés côté client.

import { db, auth } from "./firebase-config.js?v=38";
import { listFriends } from "./friends.js?v=38";
import { uploadMedia } from "./chat.js?v=38";
import {
  doc, addDoc, updateDoc, deleteDoc, arrayUnion, getDocs,
  collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STATUS_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const TEXT_STATUS_COLORS = ["#FF6B00", "#E05F00", "#2FAE60", "#1A1A1A"];

export async function createTextStatus(text) {
  const me = auth.currentUser.uid;
  const color = TEXT_STATUS_COLORS[Math.floor(Math.random() * TEXT_STATUS_COLORS.length)];
  await addDoc(collection(db, "statuses"), {
    authorUid: me,
    mediaUrl: null,
    mediaType: "text",
    text: text.trim(),
    backgroundColor: color,
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + STATUS_TTL_MS,
    viewedBy: []
  });
}

export async function createMediaStatus(file) {
  const me = auth.currentUser.uid;
  const { url, type } = await uploadMedia(file);
  await addDoc(collection(db, "statuses"), {
    authorUid: me,
    mediaUrl: url,
    mediaType: type,
    text: null,
    backgroundColor: null,
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + STATUS_TTL_MS,
    viewedBy: []
  });
}

// Renvoie les statuts actifs (non expirés) de moi + mes amis, groupés par auteur.
export async function listActiveStatusesByAuthor() {
  const me = auth.currentUser.uid;
  const friendUids = await listFriends(me);
  const authorUids = Array.from(new Set([me, ...friendUids])).slice(0, 10); // limite "in" Firestore

  if (!authorUids.length) return [];

  const q = query(collection(db, "statuses"), where("authorUid", "in", authorUids));
  const snap = await getDocs(q);
  const now = Date.now();
  const statuses = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.expiresAt > now)
    .sort((a, b) => (a.expiresAt - STATUS_TTL_MS) - (b.expiresAt - STATUS_TTL_MS));

  const grouped = {};
  statuses.forEach(s => {
    if (!grouped[s.authorUid]) grouped[s.authorUid] = [];
    grouped[s.authorUid].push(s);
  });
  return Object.entries(grouped).map(([authorUid, items]) => ({ authorUid, items }));
}

export async function markStatusViewed(statusId) {
  const me = auth.currentUser.uid;
  await updateDoc(doc(db, "statuses", statusId), { viewedBy: arrayUnion(me) });
}

export async function deleteStatus(statusId) {
  await deleteDoc(doc(db, "statuses", statusId));
}
