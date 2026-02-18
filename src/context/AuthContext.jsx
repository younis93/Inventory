import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    EmailAuthProvider,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updatePassword,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';

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
        changeAuthPassword: async (currentPassword, newPassword) => {
            if (!auth.currentUser?.email) throw new Error('No authenticated user');
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
        },
    }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
