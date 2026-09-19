import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type CallKind = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended';

export type SerializableSessionDescription = {
  type: string;
  sdp?: string;
};

export type SerializableIceCandidate = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

export type CallSession = {
  id: string;
  conversationId: string;
  callerId: string;
  participants: string[];
  kind: CallKind;
  title?: string;
  status: CallStatus;
  offer?: SerializableSessionDescription;
  answer?: SerializableSessionDescription;
  createdAt?: any;
  updatedAt?: any;
};

export async function createCall(
  conversationId: string,
  participants: string[],
  kind: CallKind,
  title?: string,
) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');

  const uniqueParticipants = [...new Set([current.uid, ...participants])];

  const ref = await addDoc(collection(db, 'calls'), {
    conversationId,
    callerId: current.uid,
    participants: uniqueParticipants,
    kind,
    ...(title ? { title } : {}),
    status: 'ringing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToCall(
  callId: string,
  callback: (call: CallSession | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'calls', callId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({ id: snapshot.id, ...snapshot.data() } as CallSession);
  });
}

export function subscribeToCallCandidates(
  callId: string,
  callback: (candidate: SerializableIceCandidate) => void,
): Unsubscribe {
  const candidatesQuery = query(
    collection(db, 'calls', callId, 'iceCandidates'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(candidatesQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        callback({
          candidate: data.candidate,
          sdpMid: data.sdpMid ?? null,
          sdpMLineIndex: data.sdpMLineIndex ?? null,
        });
      }
    });
  });
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  await updateDoc(doc(db, 'calls', callId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCallOffer(
  callId: string,
  offer: SerializableSessionDescription,
) {
  await updateDoc(doc(db, 'calls', callId), {
    offer,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCallAnswer(
  callId: string,
  answer: SerializableSessionDescription,
) {
  await updateDoc(doc(db, 'calls', callId), {
    answer,
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

export async function addCallIceCandidate(
  callId: string,
  candidate: SerializableIceCandidate,
) {
  await addDoc(collection(db, 'calls', callId, 'iceCandidates'), {
    ...candidate,
    createdAt: serverTimestamp(),
  });
}

export async function endCall(callId: string) {
  await updateDoc(doc(db, 'calls', callId), {
    status: 'ended',
    updatedAt: serverTimestamp(),
  });
}
