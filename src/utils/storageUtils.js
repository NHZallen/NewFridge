import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Uploads an image blob to Firebase Storage
 * @param {Blob} blob - The image blob to upload
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export async function uploadImage(blob) {
    if (!blob) return null;

    // Generate a unique filename: timestamp + random suffix
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}_${randomSuffix}.jpg`;
    const storageRef = ref(storage, `fridge_items/${filename}`);

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
 */
export async function deleteImage(url) {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com')) {
        return; // Not a storage URL, skip
    }

    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (error) {
        console.error("Error deleting image:", error);
        // We generally don't want to block the main flow if image deletion fails,
        // so we just log it.
    }
}
