// shopchat.js — Messagerie dédiée boutique/acheteur, distincte des discussions
// classiques (chat.js).
//
// Structure Firestore utilisée :
// /shopThreads/{threadId}                      -> { shopId, buyerUid, lastMessage, lastMessageAt, updatedAt }
// /shopThreads/{threadId}/messages/{messageId}  -> { senderUid, text, mediaUrl, mediaType, createdAt }
//
// threadId est déterministe : "{shopId}_{buyerUid}".

import { db, auth } from "./firebase-config.js?v=47";
import {
  doc, getDoc, setDoc, addDoc, updateDoc,
  collection, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function threadIdFor(shopId, buyerUid) {
  return `${shopId}_${buyerUid}`;
}

export async function startShopThread(shopId, buyerUid) {
  const id = threadIdFor(shopId, buyerUid);
  const ref = doc(db, "shopThreads", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      shopId, buyerUid,
      lastMessage: null,
      lastMessageAt: null,
      updatedAt: serverTimestamp()
    });
  }
  return id;
}

export async function getShopThread(threadId) {
  const snap = await getDoc(doc(db, "shopThreads", threadId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Fusionne les fils où je suis la boutique et ceux où je suis l'acheteur
// (Firestore ne permet pas un "OR" sur deux champs différents en une seule
// requête, donc on écoute les deux et on fusionne côté client).
export function listenToMyShopThreads(callback) {
  const me = auth.currentUser.uid;
  let asShop = [];
  let asBuyer = [];

  function emit() {
    const merged = [...asShop, ...asBuyer];
    merged.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    callback(merged);
  }

  const unsub1 = onSnapshot(query(collection(db, "shopThreads"), where("shopId", "==", me)), snap => {
    asShop = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emit();
  });
  const unsub2 = onSnapshot(query(collection(db, "shopThreads"), where("buyerUid", "==", me)), snap => {
    asBuyer = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emit();
  });

  return () => { unsub1(); unsub2(); };
}

export function listenToShopMessages(threadId, callback) {
  const q = query(collection(db, `shopThreads/${threadId}/messages`), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function sendShopMessage(threadId, { text = null, mediaUrl = null, mediaType = null }) {
  const me = auth.currentUser.uid;
  await addDoc(collection(db, `shopThreads/${threadId}/messages`), {
    senderUid: me, text, mediaUrl, mediaType, createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "shopThreads", threadId), {
    lastMessage: text || (mediaType ? "[média]" : ""),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
