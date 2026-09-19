import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAxeTALlnndp4x0LyNxxohvPFRJmRxg7Z8',
  authDomain: 'nexchat-app-v1.firebaseapp.com',
  projectId: 'nexchat-app-v1',
  storageBucket: 'nexchat-app-v1.firebasestorage.app',
  messagingSenderId: '423088174446',
  appId: '1:423088174446:web:86ce82b7112923d592bd7f',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
