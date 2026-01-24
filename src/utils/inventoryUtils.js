
export const recalculateItemFromBatches = (batches, owners) => {
    // Sort batches by expiry date then stored date
    batches.sort((a, b) => {
        const dateA = a.noExpiry ? "9999-12-31" : (a.expiryDate || "9999-12-31");
        const dateB = b.noExpiry ? "9999-12-31" : (b.expiryDate || "9999-12-31");
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        const storeA = a.storedDate || "9999-12-31";
        const storeB = b.storedDate || "9999-12-31";
        if (storeA < storeB) return -1;
        if (storeA > storeB) return 1;
        return 0;
    });

    const totalQty = batches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
    const firstBatch = batches[0] || {};

    return {
        quantity: totalQty,
        storedDate: firstBatch.storedDate || "",
        expiryDate: firstBatch.expiryDate || "",
        noExpiry: firstBatch.noExpiry || false,
        image: firstBatch.image || "",
        owners: owners,
        batches: batches
    };
};
