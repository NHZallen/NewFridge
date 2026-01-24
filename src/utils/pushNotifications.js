import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export async function setupFCM(app, db, userId, vapidKey) {
    if (!vapidKey) return null;

    try {
        const messaging = getMessaging(app);

        // 請求權限
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // 取得 Token
        const currentToken = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.ready
        });

        if (currentToken) {
            console.log('FCM Token:', currentToken);

            // 將 Token 存入 Firestore (關聯到家庭或使用者)
            const settingsRef = doc(db, "family_metadata", "general");
            await updateDoc(settingsRef, {
                fcmTokens: arrayUnion({
                    token: currentToken,
                    userId: userId,
                    updatedAt: new Date().toISOString(),
                    device: navigator.userAgent
                })
            });

            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
}

export function onForegroundMessage(app, callback) {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        if (callback) callback(payload);
    });
}
