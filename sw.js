/**
 * sw.js — Service Worker NexChat
 *
 * Stratégies :
 *  - Cache First  → assets statiques (HTML, JS, CSS, icônes, polices)
 *  - Network First → Firebase, Cloudinary, Nominatim (données en temps réel)
 *  - Bypass total  → Firebase Auth, Firestore WebSocket (ne jamais intercepter)
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────

/**
 * ⚠️ IMPORTANT : Incrémente cette version à CHAQUE déploiement.
 * Format recommandé : "nexchat-YYYYMMDD-vX"
 * Ex. : "nexchat-20260530-v2" → "nexchat-20260530-v2" si 2 déploiements le même jour.
 * Sans ce changement, les appareils continuent de servir l'ancienne version depuis le cache.
 */
const CACHE_NAME = "nexchat-20260530-v2";

/**
 * Assets à précacher lors de l'install.
 * Adaptez le chemin selon votre dépôt GitHub Pages.
 * Ex. si votre repo s'appelle "nexchat" → "/nexchat/"
 */
const PRECACHE_URLS = [
  "./",                               // index / shell HTML
  "./manifest.json",
];

// Domaines / patterns qui doivent passer en Network First
// (données en temps réel : Firebase REST, Cloudinary, Géocodage)
const NETWORK_FIRST_PATTERNS = [
  /firestore\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /firebasedatabase\.app/,            // Realtime Database REST
  /firebasestorage\.googleapis\.com/, // Cloud Storage
  /identitytoolkit\.googleapis\.com/, // Auth REST (signIn / signUp)
  /securetoken\.googleapis\.com/,     // Refresh tokens
  /cloudinary\.com/,                  // Upload & delivery
  /nominatim\.openstreetmap\.org/,    // Geocodage inverse
];

/**
 * Requêtes à ne JAMAIS intercepter.
 * Firebase Auth + Firestore utilisent des WebSockets / fetch internes
 * que le SW ne doit pas perturber.
 */
const BYPASS_PATTERNS = [
  /firebaseapp\.com/,                 // Auth domain iframes
  /accounts\.google\.com/,
  /googleapis\.com\/identitytoolkit/, // doublon de sécurité
  /localhost/,                        // dev local
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function shouldBypass(url) {
  return BYPASS_PATTERNS.some((re) => re.test(url));
}

function shouldUseNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some((re) => re.test(url));
}

function isCacheable(request, response) {
  if (!response || response.status !== 200) return false;
  if (request.method !== "GET") return false;
  // Ne pas mettre en cache les réponses opaques provenant de CDN non-CORS
  // sauf si on accepte le risque (ici on l'accepte pour les polices Google).
  return true;
}

// ─── INSTALL ───────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  console.log("[SW] Install — cache:", CACHE_NAME);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Active le SW immédiatement
  );
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate — nettoyage des anciens caches");

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[SW] Suppression ancien cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim()) // Prend le contrôle de tous les onglets ouverts
  );
});

// ─── FETCH ─────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Ignorer les requêtes non-GET (POST uploads, etc.)
  if (request.method !== "GET") return;

  // 2. Ignorer les schémas non-HTTP (chrome-extension://, etc.)
  if (!url.startsWith("http")) return;

  // 3. Bypass total — ne pas intercepter du tout
  if (shouldBypass(url)) return;

  // 4. Network First — Firebase REST, Cloudinary, Nominatim
  if (shouldUseNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 5. Cache First — tout le reste (HTML shell, JS, CSS, polices, icônes)
  event.respondWith(cacheFirst(request));
});

// ─── STRATÉGIE : CACHE FIRST ───────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);

    if (isCacheable(request, networkResponse)) {
      const cache = await caches.open(CACHE_NAME);
      // On clone car le body ne peut être lu qu'une fois
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn("[SW] Cache First — hors ligne et pas en cache:", request.url);
    // Pas de fallback générique ici pour ne pas afficher une page vide incorrecte.
    return new Response("Ressource indisponible hors ligne.", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// ─── STRATÉGIE : NETWORK FIRST ─────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Mise en cache optionnelle des réponses GET réussies
    // (utile pour Cloudinary delivery, pas pour les appels Firestore)
    if (isCacheable(request, networkResponse)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn("[SW] Network First — réseau indisponible, fallback cache:", request.url);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Aucune réponse possible
    return new Response(JSON.stringify({ error: "Hors ligne — données non disponibles." }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
