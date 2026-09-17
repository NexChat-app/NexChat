// marketplace.js — Marketplace NexChat : boutiques, produits, commandes.
// Conserve aussi l'ancienne API "listings" pour éviter toute régression.

import { db, auth } from "./firebase-config.js?v=47";
import { uploadMedia } from "./chat.js?v=47";
import {
  doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs, getDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Charge le style Marketplace sans modifier le reste de l'application.
if (!document.querySelector('link[data-nexchat-marketplace-css]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './css/marketplace.css?v=1';
  link.dataset.nexchatMarketplaceCss = '1';
  document.head.appendChild(link);
}

const currentUid = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Utilisateur non connecté.");
  return uid;
};

async function uploadOptionalPhoto(photoFile) {
  if (!photoFile) return null;
  const uploaded = await uploadMedia(photoFile);
  return uploaded.url;
}

// ---------------------------------------------------------------------------
// ANCIENNE API : petites annonces / listings
// ---------------------------------------------------------------------------

export async function createListing({ title, description, price, currency, city, photoFile, lat, lng }) {
  const me = currentUid();
  const photoUrl = await uploadOptionalPhoto(photoFile);
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

export async function listRecentListings(max = 100) {
  const q = query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listMyListings() {
  const me = currentUid();
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

// ---------------------------------------------------------------------------
// BOUTIQUES
// ---------------------------------------------------------------------------

export async function createOrUpdateShop(data = {}) {
  const me = currentUid();
  const shopId = data.shopId || data.id || me;
  const ref = doc(db, "shops", shopId);
  const existing = await getDoc(ref);
  const previous = existing.exists() ? existing.data() : {};
  const photoFile = data.photoFile || data.logoFile || null;
  const photoUrl = photoFile
    ? await uploadOptionalPhoto(photoFile)
    : (data.photoUrl ?? data.logoUrl ?? previous.photoUrl ?? previous.logoUrl ?? null);

  const shop = {
    ownerUid: me,
    name: String(data.name ?? previous.name ?? "").trim(),
    description: String(data.description ?? previous.description ?? "").trim(),
    city: String(data.city ?? previous.city ?? "").trim(),
    phone: String(data.phone ?? previous.phone ?? "").trim(),
    lat: data.lat ?? previous.lat ?? null,
    lng: data.lng ?? previous.lng ?? null,
    photoUrl,
    logoUrl: photoUrl,
    createdAt: previous.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!shop.name) throw new Error("Le nom de la boutique est obligatoire.");
  await setDoc(ref, shop, { merge: true });
  return { id: shopId, ...shop };
}

export async function getMyShop(uid = null) {
  const ownerUid = uid || currentUid();
  const snap = await getDoc(doc(db, "shops", ownerUid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getShop(shopId) {
  const snap = await getDoc(doc(db, "shops", shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listShops(max = 100) {
  const q = query(collection(db, "shops"), orderBy("updatedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------------
// PRODUITS
// ---------------------------------------------------------------------------

export async function createProduct(data = {}) {
  const me = currentUid();
  const shopId = data.shopId || data.shop?.id || me;
  const photoUrl = data.photoFile
    ? await uploadOptionalPhoto(data.photoFile)
    : (data.photoUrl ?? null);
  const name = String(data.name ?? data.title ?? "").trim();

  const product = {
    shopId,
    sellerUid: me,
    title: name,
    name,
    description: String(data.description ?? "").trim(),
    price: Number(data.price) || 0,
    currency: data.currency || "EUR",
    photoUrl,
    stock: data.stock == null || data.stock === "" ? null : Number(data.stock),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!product.name) throw new Error("Le nom du produit est obligatoire.");
  const ref = await addDoc(collection(db, "products"), product);
  return { id: ref.id, ...product };
}

export async function updateProduct(productId, data = {}) {
  const ref = doc(db, "products", productId);
  const updates = { updatedAt: serverTimestamp() };
  const name = data.name !== undefined ? String(data.name).trim() : (data.title !== undefined ? String(data.title).trim() : undefined);
  if (name !== undefined) {
    updates.name = name;
    updates.title = name;
  }
  ["description", "currency", "photoUrl", "shopId"].forEach(key => {
    if (data[key] !== undefined) updates[key] = typeof data[key] === "string" ? data[key].trim() : data[key];
  });
  if (data.photoFile) updates.photoUrl = await uploadOptionalPhoto(data.photoFile);
  if (data.price !== undefined) updates.price = Number(data.price) || 0;
  if (data.stock !== undefined) updates.stock = data.stock === "" || data.stock == null ? null : Number(data.stock);
  await updateDoc(ref, updates);
  return getProduct(productId);
}

export async function getProduct(productId) {
  const snap = await getDoc(doc(db, "products", productId));
  return snap.exists() ? { id: snap.id, ...snap.data(), name: snap.data().name ?? snap.data().title ?? "" } : null;
}

export async function deleteProduct(productId) {
  await deleteDoc(doc(db, "products", productId));
}

export async function listProducts(max = 100) {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  const products = snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().name ?? d.data().title ?? "" }));
  const shopIds = [...new Set(products.map(p => p.shopId).filter(Boolean))];
  if (shopIds.length) {
    const shops = await Promise.all(shopIds.map(id => getDoc(doc(db, "shops", id))));
    const shopMap = new Map(shops.filter(s => s.exists()).map(s => [s.id, s.data()]));
    products.forEach(p => {
      const shop = shopMap.get(p.shopId);
      if (shop) {
        p.shopName = shop.name || "";
        p.shopLat = shop.lat ?? null;
        p.shopLng = shop.lng ?? null;
      }
    });
  }
  return products;
}

export async function listProductsByShop(shopId, max = 100) {
  const q = query(collection(db, "products"), where("shopId", "==", shopId), limit(max));
  const snap = await getDocs(q);
  const products = snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().name ?? d.data().title ?? "" }));
  products.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return products;
}

export async function listMyProducts(max = 100) {
  const me = currentUid();
  const q = query(collection(db, "products"), where("sellerUid", "==", me), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().name ?? d.data().title ?? "" }));
}

// ---------------------------------------------------------------------------
// COMMANDES
// ---------------------------------------------------------------------------

export async function placeOrder(data = {}, maybeItems = null, maybeTotal = null, maybeCurrency = null) {
  const me = currentUid();
  if (typeof data === "string") {
    data = { shopId: data, items: maybeItems, total: maybeTotal, currency: maybeCurrency };
  }

  const order = {
    buyerUid: me,
    shopId: data.shopId,
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total) || 0,
    currency: data.currency || "EUR",
    status: data.status || "pending",
    shipping: data.shipping ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!order.shopId) throw new Error("Boutique introuvable.");
  if (!order.items.length) throw new Error("La commande ne contient aucun produit.");

  const ref = await addDoc(collection(db, "orders"), order);
  return { id: ref.id, ...order };
}

export async function listMyOrders(max = 100) {
  const me = currentUid();
  const q = query(collection(db, "orders"), where("buyerUid", "==", me), limit(max));
  const snap = await getDocs(q);
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return orders;
}

export async function listShopOrders(shopId, max = 100) {
  const targetShopId = shopId || currentUid();
  const q = query(collection(db, "orders"), where("shopId", "==", targetShopId), limit(max));
  const snap = await getDocs(q);
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  orders.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return orders;
}

export async function updateOrderStatus(orderId, status) {
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Statut de commande invalide.");
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(doc(db, "orders", orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
