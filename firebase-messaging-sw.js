// firebase-messaging-sw.js
// Service worker dédié aux notifications push Firebase Cloud Messaging.
// Doit être servi à la racine du site (même niveau que index.html).

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxeTALlnndp4x0LyNxxohvPFRJmRxg7Z8",
  authDomain: "nexchat-app-v1.firebaseapp.com",
  projectId: "nexchat-app-v1",
  storageBucket: "nexchat-app-v1.firebasestorage.app",
  messagingSenderId: "423088174446",
  appId: "1:423088174446:web:86ce82b7112923d592bd7f",
});

const messaging = firebase.messaging();

// Notification reçue alors que l'app est en arrière-plan ou fermée
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'NexChat';
  const options = {
    body: payload.notification?.body || '',
    icon: './assets/logo.jpg',
    badge: './assets/favicon-512.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Clic sur la notification → ouvre/focus l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
