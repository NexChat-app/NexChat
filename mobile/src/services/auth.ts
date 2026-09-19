import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccount(input: { email: string; password: string; firstName: string; lastName: string }) {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email: input.email.trim().toLowerCase(),
    firstName,
    lastName,
    firstNameLower: firstName.toLowerCase(),
    lastNameLower: lastName.toLowerCase(),
    displayName: [firstName, lastName].filter(Boolean).join(' '),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return credential.user;
}
