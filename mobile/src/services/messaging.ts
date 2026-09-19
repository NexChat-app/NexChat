import { auth, db } from '../config/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

export type UserSummary = {
  uid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL?: string;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  participantProfiles?: Record<string, UserSummary>;
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt?: any;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
};

function normalizeUser(data: DocumentData, uid: string): UserSummary {
  const firstName = String(data.firstName || '');
  const lastName = String(data.lastName || '');
  return {
    uid,
    firstName,
    lastName,
    displayName: String(data.displayName || [firstName, lastName].filter(Boolean).join(' ')),
    photoURL: data.photoURL || undefined,
  };
}

export async function getCurrentUserProfile() {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const snapshot = await getDoc(doc(db, 'users', current.uid));
  if (!snapshot.exists()) throw new Error('Profil utilisateur introuvable.');
  return normalizeUser(snapshot.data(), current.uid);
}

export async function searchUsers(term: string) {
  const current = auth.currentUser;
  const value = term.trim().toLowerCase();
  if (!current || !value) return [];

  const end = value + '\uf8ff';
  const [firstSnapshot, lastSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('firstNameLower', '>=', value), where('firstNameLower', '<=', end))),
    getDocs(query(collection(db, 'users'), where('lastNameLower', '>=', value), where('lastNameLower', '<=', end))),
  ]);

  const users = new Map<string, UserSummary>();
  for (const snapshot of [firstSnapshot, lastSnapshot]) {
    snapshot.forEach((item) => {
      if (item.id !== current.uid) users.set(item.id, normalizeUser(item.data(), item.id));
    });
  }

  return [...users.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function ensureSearchFields() {
  const current = auth.currentUser;
  if (!current) return;
  const profileRef = doc(db, 'users', current.uid);
  const profile = await getDoc(profileRef);
  if (!profile.exists()) return;
  const data = profile.data();
  await setDoc(profileRef, {
    firstNameLower: String(data.firstName || '').trim().toLowerCase(),
    lastNameLower: String(data.lastName || '').trim().toLowerCase(),
  }, { merge: true });
}

export async function getOrCreateDirectConversation(otherUser: UserSummary) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');

  const participants = [current.uid, otherUser.uid].sort();
  const conversationId = `direct_${participants.join('_')}`;
  const conversationRef = doc(db, 'conversations', conversationId);
  const existing = await getDoc(conversationRef);

  if (!existing.exists()) {
    const me = await getCurrentUserProfile();
    await setDoc(conversationRef, {
      type: 'direct',
      participants,
      participantProfiles: {
        [me.uid]: me,
        [otherUser.uid]: otherUser,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return conversationId;
}

export function subscribeToConversations(
  callback: (items: Conversation[]) => void,
): Unsubscribe {
  const current = auth.currentUser;
  if (!current) {
    callback([]);
    return () => undefined;
  }

  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', current.uid));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Conversation));
    items.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
    callback(items);
  });
}

export function subscribeToMessages(
  conversationId: string,
  callback: (items: Message[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Message)));
  });
}

export async function sendTextMessage(conversationId: string, text: string) {
  const current = auth.currentUser;
  const value = text.trim();
  if (!current || !value) return;

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    senderId: current.uid,
    text: value,
    type: 'text',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'conversations', conversationId), {
    lastMessage: value,
    lastMessageSenderId: current.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
