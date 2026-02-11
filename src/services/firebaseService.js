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
    getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Service to handle generic Firestore operations
 */
export const firebaseService = {
    /**
     * Set up a real-time listener for a collection
     */
    subscribeToCollection: (collectionName, callback, sortField = "name", sortOrder = "asc") => {
        try {
            // Try with orderBy first
            const q = sortField
                ? query(collection(db, collectionName), orderBy(sortField, sortOrder))
                : collection(db, collectionName);

            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
                callback(data);
            }, (error) => {
                console.error(`Error subscribing to ${collectionName}:`, error);
                // If orderBy fails, try without it
                if (error.code === 'failed-precondition' || error.message.includes('index')) {
                    console.log(`Retrying ${collectionName} without orderBy...`);
                    const simpleQuery = collection(db, collectionName);
                    return onSnapshot(simpleQuery, (snapshot) => {
                        const data = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
                        callback(data);
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
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            throw error;
        }
    }
};
