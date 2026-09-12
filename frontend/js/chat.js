// chat.js — Discussions 1:1
//
// Structure Firestore utilisée :
// /conversations/{conversationId}                      -> { participants:[uidA,uidB], lastMessage, lastMessageAt, updatedAt }
// /conversations/{conversationId}/messages/{messageId}  -> { senderUid, text, mediaUrl, mediaType, createdAt, editedAt }
//
// L'identifiant de conversation est déterministe : les deux uid triés et
// joints par "_". Cela évite de créer deux fois la même conversation entre
// les deux mêmes personnes.

import { db, auth, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./firebase-config.js?v=12";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function startConversation(otherUid) {
  const me = auth.currentUser.uid;
  const id = conversationIdFor(me, otherUid);
  const ref = doc(db, "conversations", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [me, otherUid],
      lastMessage: null,
      lastMessageAt: null,
      updatedAt: serverTimestamp()
    });
  }
  return id;
}

export function listenToMyConversations(callback) {
  const me = auth.currentUser.uid;
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", me),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function listenToMessages(conversationId, callback) {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function sendMessage(conversationId, { text = null, mediaUrl = null, mediaType = null }) {
  const me = auth.currentUser.uid;
  await addDoc(collection(db, `conversations/${conversationId}/messages`), {
    senderUid: me,
    text,
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp(),
    editedAt: null
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text || (mediaType ? "[média]" : ""),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function editMessage(conversationId, messageId, newText) {
  await updateDoc(doc(db, `conversations/${conversationId}/messages/${messageId}`), {
    text: newText,
    editedAt: serverTimestamp()
  });
}

export async function deleteMessage(conversationId, messageId) {
  await deleteDoc(doc(db, `conversations/${conversationId}/messages/${messageId}`));
}

// Upload d'un fichier (image ou vidéo) vers Cloudinary, en upload "unsigned"
// (aucune clé secrète nécessaire côté client).
export async function uploadMedia(file) {
  const isVideo = file.type.startsWith("video/");
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || "";
    } catch (e) {
      // réponse non-JSON, on garde detail vide
    }
    throw new Error(detail || `Échec de l'envoi du média (code ${res.status}).`);
  }
  const data = await res.json();
  return { url: data.secure_url, type: isVideo ? "video" : "image" };
}

export async function getConversation(conversationId) {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getOtherParticipant(conversation) {
  const me = auth.currentUser.uid;
  const otherUid = conversation.participants.find(uid => uid !== me);
  const snap = await getDoc(doc(db, "users", otherUid));
  return snap.exists() ? { uid: otherUid, ...snap.data() } : { uid: otherUid, username: "Utilisateur" };
}
