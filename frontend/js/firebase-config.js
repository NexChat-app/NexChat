// firebase-config.js
// Config du projet Firebase "nexchat-app-v1" (refonte NexChat)
// Chargé en tout premier, avant tout autre script applicatif.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxeTALlnndp4x0LyNxxohvPFRJmRxg7Z8",
  authDomain: "nexchat-app-v1.firebaseapp.com",
  databaseURL: "https://nexchat-app-v1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nexchat-app-v1",
  storageBucket: "nexchat-app-v1.firebasestorage.app",
  messagingSenderId: "423088174446",
  appId: "1:423088174446:web:86ce82b7112923d592bd7f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Config Cloudinary (uploads médias, non sensible côté client)
export const CLOUDINARY_CLOUD_NAME = "NexChat";
export const CLOUDINARY_UPLOAD_PRESET = "vxhmvyzh";

// URL du backend Render
export const BACKEND_URL = "https://nexchat-e7fz.onrender.com";
