// calls.js — Appels audio/vidéo 1:1 en WebRTC, signalisation via Firestore.
//
// Structure Firestore utilisée :
// /calls/{callId} -> {
//   callerUid, calleeUid, type ("audio"|"video"), status ("ringing"|"accepted"|"declined"|"ended"),
//   offer: { sdp, type }, answer: { sdp, type }, createdAt
// }
// /calls/{callId}/callerCandidates/{id} -> candidat ICE envoyé par l'appelant
// /calls/{callId}/calleeCandidates/{id} -> candidat ICE envoyé par l'appelé
//
// TURN : serveur public gratuit "Open Relay Project" (Metered), en plus des
// serveurs STUN publics de Google. Voir RTC_CONFIG ci-dessous.

import { db, auth } from "./firebase-config.js?v=38";
import {
  doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  collection, query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Pas de compte à créer : le "Open Relay Project" (Metered) fournit un TURN
// public gratuit. Suffisant pour débloquer les réseaux restrictifs pour
// l'instant ; à remplacer par un compte TURN dédié si le volume/la fiabilité
// posent problème plus tard.
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

// --- Appel sortant ---
export async function startCall(calleeUid, type) {
  const me = auth.currentUser.uid;
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video"
  });

  const pc = new RTCPeerConnection(RTC_CONFIG);
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = e => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  const callRef = doc(collection(db, "calls"));
  pc.onicecandidate = e => {
    if (e.candidate) addDoc(collection(callRef, "callerCandidates"), e.candidate.toJSON());
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await setDoc(callRef, {
    callerUid: me,
    calleeUid,
    type,
    status: "ringing",
    offer: { sdp: offer.sdp, type: offer.type },
    answer: null,
    createdAt: serverTimestamp()
  });

  const unsubDoc = onSnapshot(callRef, async snap => {
    const data = snap.data();
    if (!data) return;
    if (data.answer && !pc.currentRemoteDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    if (data.status === "declined" || data.status === "ended") {
      handlers.onEnded?.(data.status);
    }
  });

  const unsubCandidates = onSnapshot(collection(callRef, "calleeCandidates"), snap => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
      }
    });
  });

  const handlers = {};
  return {
    callId: callRef.id,
    pc,
    localStream,
    remoteStream,
    onEnded: cb => { handlers.onEnded = cb; },
    hangUp: () => endCall(callRef.id, pc, localStream, [unsubDoc, unsubCandidates])
  };
}

// --- Répondre à un appel entrant ---
export async function answerCall(callData) {
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callData.type === "video"
  });

  const pc = new RTCPeerConnection(RTC_CONFIG);
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = e => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  const callRef = doc(db, "calls", callData.id);
  pc.onicecandidate = e => {
    if (e.candidate) addDoc(collection(callRef, "calleeCandidates"), e.candidate.toJSON());
  };

  await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(callRef, {
    answer: { sdp: answer.sdp, type: answer.type },
    status: "accepted"
  });

  const handlers = {};
  const unsubDoc = onSnapshot(callRef, snap => {
    const data = snap.data();
    if (data && data.status === "ended") {
      handlers.onEnded?.(data.status);
    }
  });

  const unsubCandidates = onSnapshot(collection(callRef, "callerCandidates"), snap => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
      }
    });
  });

  return {
    callId: callRef.id,
    pc,
    localStream,
    remoteStream,
    onEnded: cb => { handlers.onEnded = cb; },
    hangUp: () => endCall(callRef.id, pc, localStream, [unsubDoc, unsubCandidates])
  };
}

export async function declineCall(callId) {
  await updateDoc(doc(db, "calls", callId), { status: "declined" });
}

async function endCall(callId, pc, localStream, unsubscribers) {
  unsubscribers.forEach(u => u());
  localStream.getTracks().forEach(t => t.stop());
  pc.close();
  try {
    await updateDoc(doc(db, "calls", callId), { status: "ended" });
  } catch (e) {
    // l'appel a peut-être déjà été supprimé/terminé par l'autre côté
  }
}

// Écoute les appels entrants (moi = calleeUid). Le filtrage sur le statut et
// la fraîcheur de l'appel se fait côté client pour éviter une requête
// composite Firestore inutile.
export function listenForIncomingCalls(onIncomingCall) {
  const me = auth.currentUser.uid;
  const seen = new Set();
  const q = query(collection(db, "calls"), where("calleeUid", "==", me));
  return onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      const id = change.doc.id;
      if (change.type !== "added" && change.type !== "modified") return;
      if (data.status !== "ringing" || seen.has(id)) return;
      const ageMs = data.createdAt ? Date.now() - data.createdAt.toMillis() : 0;
      if (ageMs > 30000) return; // appel trop ancien, probablement obsolète
      seen.add(id);
      onIncomingCall({ id, ...data });
    });
  });
}
