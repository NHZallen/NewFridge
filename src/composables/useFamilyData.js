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

/**
 * 成員結構：{ uid: string, displayName: string }
 * uid 為穩定主鍵，displayName 可隨意更改。
 * 向下相容：如果 Firestore 中存在舊格式的純字串成員，會自動遷移為物件格式。
 */

// 正規化成員：確保都是 { uid, displayName } 格式
function normalizeMember(m) {
    if (typeof m === 'string') {
        // 舊格式遷移：以 displayName 產生 uid
        return { uid: crypto.randomUUID(), displayName: m }
    }
    return m
}

function normalizeMembers(members) {
    return (members || []).map(normalizeMember)
}

export function useFamilyData() {
    const { db } = useFirebase()

    const checkAndJoinFamily = async (userName) => {
        if (!db.value) return

        const settingsRef = doc(db.value, "family_metadata", "general")
        try {
            // 使用 Transaction 避免競態條件：兩位用戶同時首次加入時不會互相覆寫
            await runTransaction(db.value, async (transaction) => {
                const docSnap = await transaction.get(settingsRef)
                if (!docSnap.exists()) {
                    const newMember = { uid: crypto.randomUUID(), displayName: userName }
                    transaction.set(settingsRef, {
                        familyName: "我的家庭",
                        members: [newMember]
                    })
                    familySettings.value = { familyName: "我的家庭", members: [newMember] }
                } else {
                    const data = docSnap.data()
                    let members = normalizeMembers(data.members)
                    const existing = members.find(m => m.displayName === userName)
                    if (!existing) {
                        const newMember = { uid: crypto.randomUUID(), displayName: userName }
                        members.push(newMember)
                        transaction.update(settingsRef, { members })
                    }
                    familySettings.value = {
                        familyName: data.familyName || "我的家庭",
                        members
                    }
                }
            })
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
                const members = normalizeMembers(data.members)

                // Immutable update to allow shallow watching in App.vue
                familySettings.value = {
                    ...familySettings.value,
                    familyName: data.familyName,
                    members
                }

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
                let members = normalizeMembers(data.members);

                // 以 uid 或 displayName 找到目標成員，更新 displayName
                const target = members.find(m => m.displayName === oldName)
                if (target) {
                    target.displayName = newName
                } else {
                    // Fallback: 找不到就新增
                    members.push({ uid: crypto.randomUUID(), displayName: newName })
                }

                // 確保無重複 displayName
                const names = members.map(m => m.displayName)
                if (new Set(names).size !== names.length) {
                    throw new Error("此名稱已被其他成員使用")
                }

                transaction.update(docRef, {
                    members,
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

    // 取得當前使用者的 uid（供未來資料關聯使用）
    const getCurrentMemberUid = () => {
        const member = familySettings.value.members.find(m => m.displayName === currentUserName.value)
        return member?.uid || null
    }

    return {
        items,
        familySettings,
        isLoading,
        currentUserName,
        setupError,
        isSettingUp,
        initFamilyData,
        updateUserName,
        updateFamilyName,
        stopListeners,
        startListeners,
        getCurrentMemberUid
    }
}
