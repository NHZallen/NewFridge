importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ⚠️ 重要：背景通知 (Background Notification) 設定
const firebaseConfig = {
    apiKey: "AIzaSyDZNAZY29ohkR-qQ9yQdSVjuz-a-BkpVdk",
    authDomain: "familyfridgeapp.firebaseapp.com",
    projectId: "familyfridgeapp",
    storageBucket: "familyfridgeapp.firebasestorage.app",
    messagingSenderId: "302477078162",
    appId: "1:302477078162:web:ba378d114f61da1cc8c04b",
    measurementId: "G-TPZQV7NWPD"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
