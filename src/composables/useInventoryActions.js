import { doc, deleteDoc, writeBatch } from 'firebase/firestore'
import { storeToRefs } from 'pinia'
import { useFirebase } from './useFirebase'
import { useMainStore } from '../stores'
import { cleanupUnusedImages } from '../utils/storageUtils'

const collectItemImages = (item) => {
    const urls = new Set()

    if (item?.image) {
        urls.add(item.image)
    }

    item?.batches?.forEach((batch) => {
        if (batch.image) {
            urls.add(batch.image)
        }
    })

    return urls
}

export function useInventoryActions({ showToast = () => {} } = {}) {
    const store = useMainStore()
    const { db } = useFirebase()
    const { items, selectedHomeIds } = storeToRefs(store)
    const FIRESTORE_BATCH_LIMIT = 500

    const commitBatchedWrites = async (ids, applyOperation) => {
        for (let index = 0; index < ids.length; index += FIRESTORE_BATCH_LIMIT) {
            const batch = writeBatch(db.value)
            const chunk = ids.slice(index, index + FIRESTORE_BATCH_LIMIT)

            chunk.forEach((id) => {
                applyOperation(batch, doc(db.value, "fridge_items", id), id)
            })

            await batch.commit()
        }
    }

    const updateShoppingStatus = async ({
        ids,
        nextStatus,
        successMessage = '',
        errorMessage = '更新失敗',
        clearSelection = false
    }) => {
        if (!ids?.length || !db.value) return false

        const snapshots = store.snapshotShoppingStatuses(ids)
        store.setShoppingStatusLocally(ids, nextStatus)

        if (clearSelection) {
            store.clearSelection()
        }

        if (successMessage) {
            showToast(successMessage)
        }

        store.startSync()

        try {
            await commitBatchedWrites(ids, (batch, docRef) => {
                batch.update(docRef, {
                    shoppingStatus: nextStatus
                })
            })
            return true
        } catch (error) {
            console.error("Shopping status update failed", error)
            store.restoreShoppingStatuses(snapshots)
            showToast(errorMessage, 'error')
            return false
        } finally {
            store.endSync()
        }
    }

    const deleteItemPermanently = async (id, { onDeleted } = {}) => {
        if (!db.value) return false

        const removedEntry = store.removeItemLocally(id)
        if (!removedEntry) return false

        if (onDeleted) {
            onDeleted()
        }

        store.startSync()
        store.beginOptimisticItemsUpdate()

        try {
            await deleteDoc(doc(db.value, "fridge_items", id))
            await cleanupUnusedImages(collectItemImages(removedEntry.item), [])
            return true
        } catch (error) {
            console.error("Delete Failed", error)
            store.restoreRemovedItems([removedEntry])
            showToast("刪除失敗，已還原", 'error')
            return false
        } finally {
            store.endOptimisticItemsUpdate()
            store.endSync()
        }
    }

    const deleteSelectedNoStock = async () => {
        if (!selectedHomeIds.value.length || !db.value) return false

        const idsToDelete = [...selectedHomeIds.value]
        const removedEntries = store.removeItemsLocally(idsToDelete)
        store.clearSelection()
        store.startSync()
        store.beginOptimisticItemsUpdate()

        try {
            await commitBatchedWrites(idsToDelete, (batch, docRef) => {
                batch.delete(docRef)
            })

            for (const { item } of removedEntries) {
                await cleanupUnusedImages(collectItemImages(item), [])
            }

            return true
        } catch (error) {
            console.error("Batch Delete Failed", error)
            store.restoreRemovedItems(removedEntries)
            showToast("刪除失敗，已還原", 'error')
            return false
        } finally {
            store.endOptimisticItemsUpdate()
            store.endSync()
        }
    }

    const addSelectedToBuy = async () => {
        return updateShoppingStatus({
            ids: [...selectedHomeIds.value],
            nextStatus: 'toBuy',
            successMessage: "已加入待購買清單",
            errorMessage: "更新失敗，已還原狀態",
            clearSelection: true
        })
    }

    return {
        items,
        updateShoppingStatus,
        deleteItemPermanently,
        deleteSelectedNoStock,
        addSelectedToBuy
    }
}
