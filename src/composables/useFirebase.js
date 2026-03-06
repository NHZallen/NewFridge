import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'firebase/auth'
import { useMainStore } from '../stores'

const appFirebase = ref(null)
const db = ref(null)
const storage = ref(null)
const auth = ref(null)
const isConfigured = ref(false)
let authUnsubscribe = null

export { db, storage, auth, isConfigured }

export function useFirebase() {
    const store = useMainStore()

    const initFirebase = async (config) => {
        try {
            if (!appFirebase.value) {
                appFirebase.value = initializeApp(config)
                db.value = getFirestore(appFirebase.value)

                if (config.storageBucket) {
                    try {
                        storage.value = getStorage(appFirebase.value)
                    } catch (storageError) {
                        console.error("Storage Init Failed:", storageError)
                    }
                } else {
                    console.warn("Storage Bucket missing in config")
                }

                try {
                    auth.value = getAuth(appFirebase.value)
                } catch (authError) {
                    console.error("Auth Init Failed:", authError)
                }
            }

            if (!authUnsubscribe && auth.value) {
                authUnsubscribe = onAuthStateChanged(auth.value, (user) => {
                    store.setCurrentUser(user)
                })
            }

            isConfigured.value = true
            return true
        } catch (error) {
            console.error("Firebase Init Error:", error)
            throw new Error(error.message || "Firebase 初始化失敗")
        }
    }

    const checkConfig = async () => {
        const storedConfig = localStorage.getItem("fridge_firebase_config")

        if (!storedConfig) {
            isConfigured.value = false
            return null
        }

        try {
            return JSON.parse(storedConfig)
        } catch (error) {
            console.error("Config load error", error)
            localStorage.removeItem("fridge_firebase_config")
            isConfigured.value = false
            return null
        }
    }

    const linkGoogleAccount = async () => {
        if (!auth.value) return { success: false, error: "No Auth" }

        try {
            await signInWithPopup(auth.value, new GoogleAuthProvider())
            return { success: true }
        } catch (error) {
            console.error("Auth Error:", error)
            return { success: false, error: error.message }
        }
    }

    const unlinkGoogleAccount = async () => {
        if (!auth.value) return { success: false }

        try {
            await signOut(auth.value)
            return { success: true }
        } catch (error) {
            console.error("SignOut Error", error)
            return { success: false, error }
        }
    }

    const resetApp = () => {
        localStorage.removeItem("fridge_firebase_config")
        localStorage.removeItem("fridge_user_name")
        location.reload()
    }

    return {
        appFirebase,
        db,
        storage,
        auth,
        isConfigured,
        initFirebase,
        checkConfig,
        linkGoogleAccount,
        unlinkGoogleAccount,
        resetApp
    }
}
