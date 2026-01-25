import { storage } from '../composables/useFirebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Uploads an image blob to Firebase Storage
 * @param {Blob} blob - The image blob to upload
 * @param {string} namePrefix - Optional prefix for filename (e.g. item name)
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export async function uploadImage(blob, namePrefix = "item") {
    if (!blob || !storage.value) return null;

    // Generate a unique filename: timestamp + prefix + random suffix
    const timestamp = Date.now();
    // Sanitize prefix to be safe for filenames (alphanumeric only)
    const safePrefix = (namePrefix || "item").replace(/[^a-zA-Z0-9]/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    // Format: 1731552000000_Milk_x8z92a.jpg
    const filename = `${timestamp}_${safePrefix}_${randomSuffix}.jpg`;
    const storageRef = ref(storage.value, `fridge_items/${filename}`);

    try {
        const snapshot = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

/**
 * Deletes an image from Firebase Storage given its URL
 * @param {string} url - The download URL of the image
 * @returns {Promise<boolean>} - True if deleted or ignored, False if error
 */
export async function deleteImage(url) {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com') || !storage.value) {
        return true; // Not a storage URL or storage not init, treat as "handled"
    }

    try {
        const storageRef = ref(storage.value, url);
        await deleteObject(storageRef);
        return true;
    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            // File already gone, success
            return true;
        }
        console.warn("Error deleting image:", error.code, url);
        // We log warning but don't throw, to avoid breaking main flows
        return false;
    }
}

/**
 * Compares two lists of image URLs and deletes those in 'oldUrls' that are NOT in 'keepingUrls'
 * @param {Array<string>|Set<string>} oldUrls - List of potential images to delete
 * @param {Array<string>|Set<string>} keepingUrls - List of images that must be KEPT
 * @returns {Promise<number>} - Count of images successfully deleted
 */
export async function cleanupUnusedImages(oldUrls, keepingUrls) {
    const start = Date.now();
    const oldSet = new Set(oldUrls);
    const keepSet = new Set(keepingUrls);
    const toDelete = new Set();

    oldSet.forEach(url => {
        if (url && !keepSet.has(url)) {
            toDelete.add(url);
        }
    });

    if (toDelete.size === 0) return 0;

    console.log(`[Storage Cleanup] Finding unused images... Found ${toDelete.size} to delete.`);

    const processes = Array.from(toDelete).map(url => deleteImage(url));
    const results = await Promise.all(processes);

    const successCount = results.filter(r => r).length;
    console.log(`[Storage Cleanup] Deleted ${successCount}/${toDelete.size} images in ${Date.now() - start}ms.`);

    return successCount;
}
