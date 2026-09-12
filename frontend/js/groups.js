// groups.js — Création de groupes et chat de groupe
//
// Structure Firestore utilisée :
// /groups/{groupId}                        -> { name, photoURL, ownerUid, memberUids[], createdAt }
// /groups/{groupId}/messages/{messageId}    -> { senderUid, text, mediaUrl, createdAt }

import { db, auth } from "./firebase-config.js?v=15";
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
    ownerUid: me,
    memberUids: allMembers,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function addMemberToGroup(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), { memberUids: arrayUnion(uid) });
}

export async function removeMemberFromGroup(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), { memberUids: arrayRemove(uid) });
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
