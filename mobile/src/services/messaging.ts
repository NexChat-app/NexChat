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
  runTransaction,
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
  name?: string;
  photoURL?: string;
  createdBy?: string;
  admins?: string[];
  participants: string[];
  participantProfiles?: Record<string, UserSummary>;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  type?: 'text' | 'image' | 'video' | 'file' | 'audio';
  replyTo?: { id: string; senderId: string; text: string };
  reactions?: Record<string, string>;
  mediaDuration?: number;
  editedAt?: any;
  deletedAt?: any;
  createdAt?: any;
};

function normalizeUser(data: DocumentData, uid: string): UserSummary {
  const firstName = String(data.firstName || '');
  const lastName = String(data.lastName || '');
  const profile: UserSummary = {
    uid,
    firstName,
    lastName,
    displayName: String(data.displayName || [firstName, lastName].filter(Boolean).join(' ')),
  };
  if (data.photoURL) profile.photoURL = String(data.photoURL);
  return profile;
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

export async function reactToMessage(conversationId: string, messageId: string, emoji: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    reactions: { [current.uid]: emoji },
  }, { merge: true });
}

export async function editTextMessage(conversationId: string, messageId: string, text: string) {
  const current = auth.currentUser;
  const value = text.trim();
  if (!current || !value) return;
  await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    text: value,
    editedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteMessage(conversationId: string, messageId: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    text: '',
    deletedAt: serverTimestamp(),
  }, { merge: true });
}

export async function sendMediaMessage(
  conversationId: string,
  media: {
    secureUrl: string;
    publicId: string;
    name: string;
    mimeType: string;
    size?: number;
    kind: 'image' | 'video' | 'file';
  },
  replyTo?: Message,
) {
  const { current } = await assertConversationMember(conversationId);

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const label = media.kind === 'image' ? 'Image' : media.kind === 'video' ? 'Vidéo' : media.name;

  await addDoc(messagesRef, {
    senderId: current.uid,
    text: '',
    type: media.kind,
    mediaUrl: media.secureUrl,
    mediaPublicId: media.publicId,
    mediaName: media.name,
    mediaMimeType: media.mimeType,
    ...(media.size ? { mediaSize: media.size } : {}),
    ...(replyTo ? {
      replyTo: { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text },
    } : {}),
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'conversations', conversationId), {
    lastMessage: label,
    lastMessageSenderId: current.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function sendAudioMessage(
  conversationId: string,
  media: { secureUrl: string; publicId: string; durationSeconds?: number },
  replyTo?: Message,
) {
  const { current } = await assertConversationMember(conversationId);

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: current.uid,
    text: '',
    type: 'audio',
    mediaUrl: media.secureUrl,
    mediaPublicId: media.publicId,
    ...(media.durationSeconds ? { mediaDuration: media.durationSeconds } : {}),
    ...(replyTo ? {
      replyTo: { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text },
    } : {}),
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'conversations', conversationId), {
    lastMessage: 'Message vocal',
    lastMessageSenderId: current.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function assertConversationMember(conversationId: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (!snapshot.exists()) throw new Error('Conversation introuvable.');
  const data = snapshot.data() as Conversation;
  if (!data.participants.includes(current.uid)) throw new Error('Vous ne faites pas partie de cette conversation.');
  return { current, data };
}

export async function sendTextMessage(conversationId: string, text: string, replyTo?: Message) {
  const { current } = await assertConversationMember(conversationId);
  const value = text.trim();
  if (!value) return;

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    senderId: current.uid,
    text: value,
    type: 'text',
    ...(replyTo ? {
      replyTo: { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text },
    } : {}),
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'conversations', conversationId), {
    lastMessage: value,
    lastMessageSenderId: current.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}


export async function createGroupConversation(name: string, members: UserSummary[]) {
  const current = auth.currentUser;
  const cleanName = name.trim();
  if (!current) throw new Error('Utilisateur non connecté.');
  if (!cleanName) throw new Error('Le nom du groupe est requis.');
  if (members.length < 1) throw new Error('Ajoute au moins un membre.');

  const me = await getCurrentUserProfile();
  const uniqueMembers = members.filter((member, index, array) =>
    member.uid !== current.uid && array.findIndex((item) => item.uid === member.uid) === index
  );
  const participants = [current.uid, ...uniqueMembers.map((member) => member.uid)];
  const conversationRef = doc(collection(db, 'conversations'));

  const participantProfiles: Record<string, UserSummary> = { [me.uid]: me };
  for (const member of uniqueMembers) participantProfiles[member.uid] = member;

  await setDoc(conversationRef, {
    type: 'group',
    name: cleanName,
    createdBy: current.uid,
    admins: [current.uid],
    participants,
    participantProfiles,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return conversationRef.id;
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (!snapshot.exists()) throw new Error('Conversation introuvable.');
  return { id: snapshot.id, ...snapshot.data() } as Conversation;
}

export async function updateGroupInfo(
  conversationId: string,
  patch: { name?: string; photoURL?: string },
) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');

  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (!snapshot.exists()) throw new Error('Groupe introuvable.');
  const data = snapshot.data() as Conversation;
  if (data.type !== 'group') throw new Error('Cette conversation n’est pas un groupe.');

  const canManage = data.createdBy === current.uid || (data.admins || []).includes(current.uid);
  if (!canManage) throw new Error('Seuls les administrateurs peuvent modifier le groupe.');

  const cleanName = patch.name?.trim();
  if (patch.name !== undefined && !cleanName) throw new Error('Le nom du groupe ne peut pas être vide.');

  await setDoc(doc(db, 'conversations', conversationId), {
    ...(cleanName !== undefined ? { name: cleanName } : {}),
    ...(patch.photoURL !== undefined ? { photoURL: patch.photoURL } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function addGroupMember(conversationId: string, member: UserSummary) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);
  if (!snapshot.exists()) throw new Error('Groupe introuvable.');
  const data = snapshot.data() as Conversation;
  if (data.createdBy !== current.uid && !(data.admins || []).includes(current.uid)) {
    throw new Error('Seuls les administrateurs peuvent ajouter des membres.');
  }
  if (data.participants.includes(member.uid)) return;
  await setDoc(conversationRef, {
    participants: [...data.participants, member.uid],
    participantProfiles: { ...(data.participantProfiles || {}), [member.uid]: member },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function removeGroupMember(conversationId: string, memberUid: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);
  if (!snapshot.exists()) throw new Error('Groupe introuvable.');
  const data = snapshot.data() as Conversation;
  const isCreator = data.createdBy === current.uid;
  const isAdmin = (data.admins || []).includes(current.uid);
  if (!isCreator && !isAdmin) {
    throw new Error('Seuls les administrateurs peuvent retirer des membres.');
  }
  if (memberUid === data.createdBy) throw new Error('Le créateur du groupe ne peut pas être retiré.');
  if (!isCreator && (data.admins || []).includes(memberUid)) {
    throw new Error('Seul le créateur peut retirer un administrateur.');
  }
  const profiles = { ...(data.participantProfiles || {}) };
  delete profiles[memberUid];
  await setDoc(conversationRef, {
    participants: data.participants.filter((uid) => uid !== memberUid),
    participantProfiles: profiles,
    admins: (data.admins || []).filter((uid) => uid !== memberUid),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function setGroupAdmin(conversationId: string, memberUid: string, isAdmin: boolean) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');
  const conversationRef = doc(db, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);
  if (!snapshot.exists()) throw new Error('Groupe introuvable.');
  const data = snapshot.data() as Conversation;
  if (data.createdBy !== current.uid) throw new Error('Seul le créateur peut gérer les administrateurs.');
  if (!data.participants.includes(memberUid)) throw new Error('Ce membre ne fait pas partie du groupe.');
  const admins = new Set(data.admins || []);
  if (isAdmin) admins.add(memberUid); else admins.delete(memberUid);
  admins.add(data.createdBy);
  await setDoc(conversationRef, { admins: [...admins], updatedAt: serverTimestamp() }, { merge: true });
}
export async function transferGroupOwnership(conversationId: string, newOwnerUid: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');

  const conversationRef = doc(db, 'conversations', conversationId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists()) throw new Error('Groupe introuvable.');
    const data = snapshot.data() as Conversation;

    if (data.type !== 'group') throw new Error('Cette conversation n’est pas un groupe.');
    if (data.createdBy !== current.uid) throw new Error('Seul le créateur peut transférer le groupe.');
    if (!data.participants.includes(newOwnerUid)) throw new Error('Le nouveau propriétaire doit être membre du groupe.');
    if (newOwnerUid === current.uid) return;

    const admins = new Set(data.admins || []);
    admins.add(newOwnerUid);
    admins.add(current.uid);

    transaction.update(conversationRef, {
      createdBy: newOwnerUid,
      admins: [...admins],
      updatedAt: serverTimestamp(),
    });
  });
}

export async function leaveGroup(conversationId: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Utilisateur non connecté.');

  const conversationRef = doc(db, 'conversations', conversationId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists()) throw new Error('Groupe introuvable.');
    const data = snapshot.data() as Conversation;

    if (data.type !== 'group') throw new Error('Cette conversation n’est pas un groupe.');
    if (!data.participants.includes(current.uid)) return;
    if (data.createdBy === current.uid) {
      throw new Error('Transfère d’abord la propriété du groupe avant de le quitter.');
    }

    const profiles = { ...(data.participantProfiles || {}) };
    delete profiles[current.uid];

    transaction.update(conversationRef, {
      participants: data.participants.filter((uid) => uid !== current.uid),
      participantProfiles: profiles,
      admins: (data.admins || []).filter((uid) => uid !== current.uid),
      updatedAt: serverTimestamp(),
    });
  });
}

