import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type CallKind = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended';

export type CallSession = {
  id: string;
  conversationId: string;
  callerId: string;
  participants: string[];
  kind: CallKind;
  status: CallStatus;
  offer?: { type: string; sdp?: string };
  answer?: { type: string; sdp?: string };
  createdAt?: any;
  updatedAt?: any;
};

export async function createCall(conversationId: string, participants: string[], kind: CallKind) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const uniqueParticipants = [...new Set([current.uid, ...participants])];

  const ref = await addDoc(collection(db, 'calls'), {
    conversationId,
    callerId: current.uid,
    participants: uniqueParticipants,
    kind,
    status: 'ringing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToCall(callId: string, callback: (call: CallSession | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'calls', callId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as CallSession);
  });
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  await updateDoc(doc(db, 'calls', callId), { status, updatedAt: serverTimestamp() });
}

export async function saveCallOffer(callId: string, offer: { type: string; sdp?: string }) {
  await updateDoc(doc(db, 'calls', callId), { offer, updatedAt: serverTimestamp() });
}

export async function saveCallAnswer(callId: string, answer: { type: string; sdp?: string }) {
  await updateDoc(doc(db, 'calls', callId), { answer, status: 'accepted', updatedAt: serverTimestamp() });
}

export async function addCallIceCandidate(callId: string, candidate: Record<string, any>) {
  await addDoc(collection(db, 'calls', callId, 'iceCandidates'), {
    ...candidate,
    createdAt: serverTimestamp(),
  });
}

export async function endCall(callId: string) {
  await updateDoc(doc(db, 'calls', callId), { status: 'ended', updatedAt: serverTimestamp() });
}
