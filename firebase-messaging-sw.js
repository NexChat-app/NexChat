/* Service worker NexChat : notifications push (Firebase Cloud Messaging) */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxeTALlnndp4x0LyNxxohvPFRJmRxg7Z8",
  authDomain: "nexchat-app-v1.firebaseapp.com",
  projectId: "nexchat-app-v1",
  storageBucket: "nexchat-app-v1.firebasestorage.app",
  messagingSenderId: "423088174446",
  appId: "1:423088174446:web:86ce82b7112923d592bd7f"
});

/* Les messages avec un champ "notification" sont affiches automatiquement par FCM en arriere-plan. */
firebase.messaging();

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.notification && event.notification.data.FCM_MSG.notification.click_action) ||
    (event.notification.data && event.notification.data.link) || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) { return list[i].focus(); }
      }
      return clients.openWindow(target);
    })
  );
});
