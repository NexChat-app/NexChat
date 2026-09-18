// groups.js — Création de groupes et chat de groupe
//
// Structure Firestore utilisée :
// /groups/{groupId}                        -> { name, photoURL, description, ownerUid, memberUids[], adminUids[], createdAt }
// /groups/{groupId}/messages/{messageId}    -> { senderUid, text, mediaUrl, createdAt }
//
// Permissions (voir firestore.rules) : le propriétaire (ownerUid) est admin
// de fait même si adminUids ne l'inclut pas encore (anciens groupes créés
// avant l'introduction des admins). Seuls les admins peuvent modifier
// nom/photo/description, retirer des membres, ou changer adminUids. Tous
// les membres peuvent ajouter d'autres membres.

import { db, auth } from "./firebase-config.js?v=47";
import {
  doc, addDoc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function createGroup(name, memberUids) {
  const me = auth.currentUser.uid;
  const allMembers = Array.from(new Set([me, ...memberUids]));

  const ref = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    photoURL: null,
    description: "",
    ownerUid: me,
    memberUids: allMembers,
    adminUids: [me],
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function addMemberToGroup(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), { memberUids: arrayUnion(uid) });
}

export async function removeMemberFromGroup(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), {
    memberUids: arrayRemove(uid),
    adminUids: arrayRemove(uid)
  });
}

export async function updateGroupInfo(groupId, { name, description, photoURL } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (photoURL !== undefined) patch.photoURL = photoURL;
  await updateDoc(doc(db, "groups", groupId), patch);
}

export async function promoteToAdmin(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), { adminUids: arrayUnion(uid) });
}

export async function demoteFromAdmin(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), { adminUids: arrayRemove(uid) });
}

export function listenToMyGroups(callback) {
  const me = auth.currentUser.uid;
  const q = query(collection(db, "groups"), where("memberUids", "array-contains", me));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function sendGroupMessage(groupId, { text = null, mediaUrl = null, mediaType = null }) {
  const me = auth.currentUser.uid;
  await addDoc(collection(db, `groups/${groupId}/messages`), {
    senderUid: me,
    text,
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "groups", groupId), {
    lastMessage: text || (mediaType ? "[média]" : ""),
    lastMessageAt: serverTimestamp()
  });
}

export function listenToGroupMessages(groupId, callback) {
  const q = query(collection(db, `groups/${groupId}/messages`), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function getGroup(groupId) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
