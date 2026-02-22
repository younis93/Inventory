import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    getDocs,
    where
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Service to handle generic Firestore operations
 */
export const firebaseService = {
    /**
     * Check if a user exists by email
     */
    getUserByEmail: async (email) => {
        if (!email) return null;
        try {
            const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { _id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error checking user existence:", error);
            // If we can't check (e.g. permission denied), we should probably fail safe and say not found
            // unless we want to allow login and then let InventoryContext handle it.
            // But the requirement is to block login.
            return null;
        }
    },
    /**
     * Set up a real-time listener for a collection
     */
    subscribeToCollection: (collectionName, callback, sortField = "name", sortOrder = "asc", onError) => {
        try {
            if (!collectionName || typeof callback !== 'function') {
                console.error('subscribeToCollection: invalid arguments', { collectionName, callback });
                return () => { };
            }
            // Try with orderBy first
            const q = sortField
                ? query(collection(db, collectionName), orderBy(sortField, sortOrder))
                : collection(db, collectionName);

            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
                callback(data);
            }, (error) => {
                console.error(`Error subscribing to ${collectionName}:`, error);
                if (onError) onError(error);

                // If orderBy fails, try without it
                if (error.code === 'failed-precondition' || error.message.includes('index')) {
                    console.log(`Retrying ${collectionName} without orderBy...`);
                    const simpleQuery = collection(db, collectionName);
                    return onSnapshot(simpleQuery, (snapshot) => {
                        const data = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
                        callback(data);
                    }, (err) => {
                        if (onError) onError(err);
                    });
                }
            });
        } catch (error) {
            console.error(`Error setting up subscription for ${collectionName}:`, error);
            // Return a no-op unsubscribe function
            return () => { };
        }
    },

    /**
     * Add a new document to a collection
     */
    add: async (collectionName, data) => {
        if (!collectionName) throw new Error('add: collectionName is required');
        try {
            const docRef = await addDoc(collection(db, collectionName), data);
            return { ...data, _id: docRef.id };
        } catch (error) {
            console.error(`Error adding to ${collectionName}:`, error);
            throw error;
        }
    },

    /**
     * Update an existing document
     */
    update: async (collectionName, id, data) => {
        if (!collectionName || !id) throw new Error('update: collectionName and id are required');
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error(`Error updating ${collectionName}:`, error);
            throw error;
        }
    },

    /**
     * Set a document with a specific ID
     */
    set: async (collectionName, id, data) => {
        if (!collectionName || !id) throw new Error('set: collectionName and id are required');
        try {
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, data);
        } catch (error) {
            console.error(`Error setting in ${collectionName}:`, error);
            throw error;
        }
    },

    /**
     * Delete a document
     */
    delete: async (collectionName, id) => {
        if (!collectionName || !id) throw new Error('delete: collectionName and id are required');
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            throw error;
        }
    },

    /**
     * Clear an entire collection
     */
    clearCollection: async (collectionName) => {
        if (!collectionName) throw new Error('clearCollection: collectionName is required');
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
        } catch (error) {
            console.error(`Error clearing ${collectionName}:`, error);
            throw error;
        }
    }
};
