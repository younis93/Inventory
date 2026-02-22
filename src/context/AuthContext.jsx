import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    EmailAuthProvider,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    onIdTokenChanged,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updatePassword,
    updateProfile,
} from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { dataClient } from '../data/dataClient';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!dataClient.isDesktop()) return;
        dataClient.setSyncConfig({
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
        }).catch(() => { });

        const unsub = onIdTokenChanged(auth, async (nextUser) => {
            try {
                const token = nextUser ? await nextUser.getIdToken() : null;
                await dataClient.setAuthToken(token);
            } catch {
                await dataClient.setAuthToken(null);
            }
        });
        return unsub;
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        signInWithGoogle: async () => {
            const provider = new GoogleAuthProvider();
            return signInWithPopup(auth, provider);
        },
        signInWithEmail: async (email, password) => signInWithEmailAndPassword(auth, email, password),
        signUpWithEmail: async (email, password) => createUserWithEmailAndPassword(auth, email, password),
        signOutUser: async () => signOut(auth),
        updateAuthProfile: async (profile) => {
            if (!auth.currentUser) throw new Error('No authenticated user');
            await updateProfile(auth.currentUser, profile);
            setUser({ ...auth.currentUser });
        },
        updateAuthAvatar: async (avatarDataUrl) => {
            if (!auth.currentUser) throw new Error('No authenticated user');
            try {
                const blob = await dataUrlToBlob(avatarDataUrl);
                const avatarRef = ref(storage, `users/${auth.currentUser.uid}/avatar.jpg`);
                await uploadBytes(avatarRef, blob, { contentType: blob.type || 'image/jpeg' });
                const photoURL = await getDownloadURL(avatarRef);
                await updateProfile(auth.currentUser, { photoURL });
                setUser({ ...auth.currentUser });
                return photoURL;
            } catch (storageError) {
                // Fallback for environments where Storage is unavailable/misconfigured.
                await updateProfile(auth.currentUser, { photoURL: avatarDataUrl });
                setUser({ ...auth.currentUser });
                return avatarDataUrl;
            }
        },
        changeAuthPassword: async (currentPassword, newPassword) => {
            if (!auth.currentUser?.email) throw new Error('No authenticated user');
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
        },
    }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
    const dataUrlToBlob = async (dataUrl) => {
        const response = await fetch(dataUrl);
        return response.blob();
    };
