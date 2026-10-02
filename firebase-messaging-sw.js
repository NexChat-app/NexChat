/* NexChat - service worker des notifications push (Firebase Cloud Messaging)
   A deposer a cote de index.html, a la racine du site. */

/* Clic sur une notification : ouvre ou active NexChat sur la bonne discussion.
   Ce gestionnaire est enregistre AVANT le SDK Firebase et remplace son comportement par defaut. */
self.addEventListener('notificationclick', function (event) {
  event.stopImmediatePropagation();
  event.notification.close();
  if (event.action === 'ignore') { return; }

  var d = event.notification.data || {};
  var fcm = d.FCM_MSG || d;
  var data = (fcm && fcm.data) || d || {};
  var link = (fcm && fcm.fcmOptions && fcm.fcmOptions.link) || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
          c.postMessage({ nexOpen: { type: data.type || '', cid: data.cid || '', gid: data.gid || '', callId: data.callId || '' } });
          return c.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAxeTALlnndp4x0LyNxxohvPFRJmRxg7Z8',
  authDomain: 'nexchat-app-v1.firebaseapp.com',
  projectId: 'nexchat-app-v1',
  storageBucket: 'nexchat-app-v1.firebasestorage.app',
  messagingSenderId: '423088174446',
  appId: '1:423088174446:web:86ce82b7112923d592bd7f'
});

/* Les messages avec le champ "notification" sont affiches automatiquement par le SDK. */
firebase.messaging();
