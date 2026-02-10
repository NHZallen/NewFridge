
export const sortBatches = (batches) => {
    return [...batches].sort((a, b) => {
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
};

export const deductFromBatches = (batches, amountToRemove) => {
    // 1. Sort batches (FEFO)
    const sortedBatches = sortBatches(batches);

    const newBatches = [];
    let remaining = amountToRemove;
    const potentiallyDeletedImages = new Set();

    for (let batch of sortedBatches) {
        if (remaining <= 0) {
            newBatches.push(batch);
            continue;
        }

        let batchQty = parseInt(batch.quantity);

        // Track images of consumed batches
        if (batch.image) potentiallyDeletedImages.add(batch.image);

        if (batchQty > remaining) {
            // Partial deduction
            const updatedBatch = { ...batch, quantity: batchQty - remaining };
            remaining = 0;
            newBatches.push(updatedBatch);
        } else {
            // Full deduction
            remaining -= batchQty;
        }
    }

    return {
        newBatches,
        remainingAmount: remaining, // Should be 0 if successful
        potentiallyDeletedImages
    };
};

export const recalculateItemFromBatches = (batches, owners) => {
    // Sort batches by expiry date then stored date
    const sortedBatches = sortBatches(batches);

    const totalQty = sortedBatches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
    const firstBatch = sortedBatches[0] || {};

    return {
        quantity: totalQty,
        storedDate: firstBatch.storedDate || "",
        expiryDate: firstBatch.expiryDate || "",
        noExpiry: firstBatch.noExpiry || false,
        image: firstBatch.image || "",
        owners: owners,
        batches: sortedBatches
    };
};
