import { getTodayStr } from './dateUtils'

export const createEmptyItemDraft = () => ({
    id: null,
    name: "",
    quantity: "1",
    storedDate: getTodayStr(),
    expiryDate: "",
    noExpiry: false,
    image: null,
    zone: "cold",
    owners: ['全家'],
    useExistingImage: false,
    shoppingStatus: null
})

export const createDraftFromItem = (item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    storedDate: item.storedDate,
    expiryDate: item.expiryDate,
    noExpiry: item.noExpiry,
    image: item.image,
    zone: item.zone || 'cold',
    owners: item.owners || ['全家'],
    useExistingImage: false,
    shoppingStatus: item.shoppingStatus || null
})

export const createPurchaseDraft = (item) => ({
    ...createEmptyItemDraft(),
    name: item.name,
    zone: item.zone || 'cold',
    owners: item.owners || ['全家']
})
