// marketplace.js — Petites annonces (Marketplace)
//
// Structure Firestore utilisée :
// /listings/{listingId} -> {
//   sellerUid, title, description, price, currency,
//   photoUrl, city, lat, lng, createdAt
// }

import { db, auth } from "./firebase-config.js?v=26";
import { uploadMedia } from "./chat.js?v=26";
import {
  doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function createListing({ title, description, price, currency, city, photoFile, lat, lng }) {
  const me = auth.currentUser.uid;
  let photoUrl = null;
  if (photoFile) {
    const uploaded = await uploadMedia(photoFile);
    photoUrl = uploaded.url;
  }
  await addDoc(collection(db, "listings"), {
    sellerUid: me,
    title: title.trim(),
    description: description.trim(),
    price: Number(price) || 0,
    currency: currency || "EUR",
    photoUrl,
    city: city.trim(),
    lat: lat ?? null,
    lng: lng ?? null,
    createdAt: serverTimestamp()
  });
}

// Récupère les annonces les plus récentes (le filtrage texte/ville/rayon se
// fait ensuite côté client, Firestore ne faisant pas de recherche plein texte).
export async function listRecentListings(max = 100) {
  const q = query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listMyListings() {
  const me = auth.currentUser.uid;
  const q = query(collection(db, "listings"), where("sellerUid", "==", me));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getListing(listingId) {
  const snap = await getDoc(doc(db, "listings", listingId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteListing(listingId) {
  await deleteDoc(doc(db, "listings", listingId));
}

// Distance à vol d'oiseau (formule de Haversine), en kilomètres.
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
