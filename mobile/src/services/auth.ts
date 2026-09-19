import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccount(input: { email: string; password: string; firstName: string; lastName: string }) {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(' '),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return credential.user;
}
