import { ref } from 'vue'
import { collection, doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore'
import { useFirebase } from './useFirebase'

// Singleton state to persist across component mounting if needed
const items = ref([])
const familySettings = ref({
    familyName: "我的家庭",
    members: []
})
const isLoading = ref(false)
const currentUserName = ref("")
const isSettingUp = ref(false)
const setupError = ref("")

// Listener unsubscribe functions
let unsubscribeItems = null
let unsubscribeSettings = null

export function useFamilyData() {
    const { db } = useFirebase()

    const checkAndJoinFamily = async (userName) => {
        if (!db.value) return

        const settingsRef = doc(db.value, "family_metadata", "general")
        try {
            const docSnap = await getDoc(settingsRef)
            if (!docSnap.exists()) {
                await setDoc(settingsRef, {
                    familyName: "我的家庭",
                    members: [userName]
                })
                familySettings.value = { familyName: "我的家庭", members: [userName] }
            } else {
                // Atomic Update: Join Family
                await updateDoc(settingsRef, {
                    members: arrayUnion(userName)
                })
                // Listener will update local state, but we ensure basic data is ready
                const data = docSnap.data()
                familySettings.value = {
                    familyName: data.familyName || "我的家庭",
                    members: data.members // This might be stale until snapshot updates, but acceptable
                }
            }
        } catch (e) {
            console.error("Family Setup Error", e)
            throw e
        }
    }

    const stopListeners = () => {
        if (unsubscribeItems) {
            unsubscribeItems()
            unsubscribeItems = null
        }
        if (unsubscribeSettings) {
            unsubscribeSettings()
            unsubscribeSettings = null
        }
    }

    const startListeners = () => {
        if (!db.value) return

        // Clean up existing listeners first to prevent duplicates
        stopListeners()

        // Items listener
        unsubscribeItems = onSnapshot(collection(db.value, "fridge_items"), (snapshot) => {
            items.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            // First load done
            isLoading.value = false
        }, (error) => {
            console.error("Items Listener Error:", error)
            isLoading.value = false
        })

        // Family settings listener
        unsubscribeSettings = onSnapshot(doc(db.value, "family_metadata", "general"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                familySettings.value.familyName = data.familyName
                familySettings.value.members = data.members || []

                // Handle Rename logic
                if (data.latest_rename) {
                    const { from, to, at } = data.latest_rename
                    const now = Date.now()
                    if (from === currentUserName.value && (now - at < 60000)) {
                        currentUserName.value = to
                        localStorage.setItem("fridge_user_name", to)
                    }
                }
            }
        }, (error) => {
            console.error("Settings Listener Error:", error)
        })
    }

    const initFamilyData = async (userName) => {
        if (!userName) return

        currentUserName.value = userName
        localStorage.setItem("fridge_user_name", userName)

        isLoading.value = true

        try {
            await checkAndJoinFamily(userName)
            startListeners()
        } catch (e) {
            console.error(e)
            isLoading.value = false
        }
    }

    const updateFamilyName = async (newName) => {
        if (!newName?.trim() || !db.value) return
        try {
            await updateDoc(doc(db.value, "family_metadata", "general"), {
                familyName: newName.trim()
            })
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const updateUserName = async (oldName, newName) => {
        if (!newName || !db.value) return false
        const docRef = doc(db.value, "family_metadata", "general")

        try {
            // Atomic Rename using Transaction
            await runTransaction(db.value, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                if (!docSnap.exists()) throw "Document does not exist!";

                const data = docSnap.data();
                let members = data.members || [];

                // Remove old, add new
                const newMembers = members.filter(m => m !== oldName);
                if (!newMembers.includes(newName)) {
                    newMembers.push(newName);
                }

                transaction.update(docRef, {
                    members: newMembers,
                    latest_rename: { from: oldName, to: newName, at: Date.now() }
                });
            });

            currentUserName.value = newName
            localStorage.setItem("fridge_user_name", newName)
            return true
        } catch (e) {
            console.error("Rename failed", e)
            return false
        }
    }

    return {
        items,
        familySettings,
        isLoading,
        currentUserName,
        setupError,
        isSettingUp,
        initFamilyData,
        updateFamilyName,
        updateUserName,
        stopListeners
    }
}

