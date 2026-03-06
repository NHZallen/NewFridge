import { ref } from 'vue'
import { collection, doc, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore'
import { storeToRefs } from 'pinia'
import { useFirebase } from './useFirebase'
import { useMainStore } from '../stores'

const DEFAULT_FAMILY_NAME = '我的家庭'

const isSettingUp = ref(false)
const setupError = ref("")

let unsubscribeItems = null
let unsubscribeSettings = null

function normalizeMember(member) {
    if (typeof member === 'string') {
        return { uid: crypto.randomUUID(), displayName: member }
    }

    return member
}

function normalizeMembers(members) {
    return (members || []).map(normalizeMember)
}

export function useFamilyData() {
    const { db } = useFirebase()
    const store = useMainStore()
    const { familySettings, currentUserName } = storeToRefs(store)

    const checkAndJoinFamily = async (userName) => {
        if (!db.value) return

        const settingsRef = doc(db.value, "family_metadata", "general")

        await runTransaction(db.value, async (transaction) => {
            const docSnap = await transaction.get(settingsRef)

            if (!docSnap.exists()) {
                const newMember = { uid: crypto.randomUUID(), displayName: userName }
                const nextSettings = {
                    familyName: DEFAULT_FAMILY_NAME,
                    members: [newMember]
                }

                transaction.set(settingsRef, nextSettings)
                store.setFamilySettings(nextSettings)
                return
            }

            const data = docSnap.data()
            const members = normalizeMembers(data.members)
            const existing = members.find((member) => member.displayName === userName)

            if (!existing) {
                members.push({ uid: crypto.randomUUID(), displayName: userName })
                transaction.update(settingsRef, { members })
            }

            store.setFamilySettings({
                familyName: data.familyName || DEFAULT_FAMILY_NAME,
                members
            })
        })
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

        stopListeners()

        unsubscribeItems = onSnapshot(
            collection(db.value, "fridge_items"),
            (snapshot) => {
                store.applyRemoteItems(snapshot.docs.map((entry) => ({
                    id: entry.id,
                    ...entry.data()
                })))
                store.setLoading(false)
            },
            (error) => {
                console.error("Items Listener Error:", error)
                store.setLoading(false)
            }
        )

        unsubscribeSettings = onSnapshot(
            doc(db.value, "family_metadata", "general"),
            (docSnap) => {
                if (!docSnap.exists()) return

                const data = docSnap.data()
                const members = normalizeMembers(data.members)

                store.setFamilySettings({
                    ...familySettings.value,
                    familyName: data.familyName || DEFAULT_FAMILY_NAME,
                    members
                })

                if (!data.latest_rename) return

                const { from, to, at } = data.latest_rename
                const now = Date.now()
                if (from === currentUserName.value && (now - at < 60000)) {
                    store.setCurrentUserName(to)
                    localStorage.setItem("fridge_user_name", to)
                }
            },
            (error) => {
                console.error("Settings Listener Error:", error)
            }
        )
    }

    const initFamilyData = async (userName) => {
        if (!userName) return

        store.setCurrentUserName(userName)
        localStorage.setItem("fridge_user_name", userName)
        store.setLoading(true)

        try {
            await checkAndJoinFamily(userName)
            startListeners()
        } catch (error) {
            console.error(error)
            store.setLoading(false)
        }
    }

    const updateFamilyName = async (newName) => {
        if (!newName?.trim() || !db.value) return false

        try {
            await updateDoc(doc(db.value, "family_metadata", "general"), {
                familyName: newName.trim()
            })
            return true
        } catch (error) {
            console.error(error)
            return false
        }
    }

    const updateUserName = async (oldName, newName) => {
        if (!newName || !db.value) return false

        const docRef = doc(db.value, "family_metadata", "general")

        try {
            await runTransaction(db.value, async (transaction) => {
                const docSnap = await transaction.get(docRef)
                if (!docSnap.exists()) {
                    throw new Error("Document does not exist")
                }

                const data = docSnap.data()
                const members = normalizeMembers(data.members)
                const target = members.find((member) => member.displayName === oldName)

                if (target) {
                    target.displayName = newName
                } else {
                    members.push({ uid: crypto.randomUUID(), displayName: newName })
                }

                const names = members.map((member) => member.displayName)
                if (new Set(names).size !== names.length) {
                    throw new Error("名稱重複")
                }

                transaction.update(docRef, {
                    members,
                    latest_rename: { from: oldName, to: newName, at: Date.now() }
                })
            })

            store.setCurrentUserName(newName)
            localStorage.setItem("fridge_user_name", newName)
            return true
        } catch (error) {
            console.error("Rename failed", error)
            return false
        }
    }

    const getCurrentMemberUid = () => {
        const member = familySettings.value.members.find(
            (entry) => entry.displayName === currentUserName.value
        )
        return member?.uid || null
    }

    return {
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
