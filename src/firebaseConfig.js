import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
    apiKey: "AIzaSyDZNAZY29ohkR-qQ9yQdSVjuz-a-BkpVdk",
    authDomain: "familyfridgeapp.firebaseapp.com",
    projectId: "familyfridgeapp",
    storageBucket: "familyfridgeapp.firebasestorage.app",
    messagingSenderId: "302477078162",
    appId: "1:302477078162:web:ba378d114f61da1cc8c04b",
    measurementId: "G-TPZQV7NWPD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
