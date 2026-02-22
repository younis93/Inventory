import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { dataClient } from '../data/dataClient';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.651 32.657 29.251 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.846 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819A11.955 11.955 0 0 1 24 12c3.059 0 5.846 1.154 7.961 3.039l5.657-5.657A19.9 19.9 0 0 0 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.977 13.409-5.197l-6.19-5.238A11.956 11.956 0 0 1 24 36c-5.229 0-9.614-3.316-11.278-7.946l-6.522 5.024C9.514 39.556 16.152 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.084 5.565l6.19 5.238C36.971 39.15 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);

const formatAuthError = (err, lang = 'en') => {
    const code = err?.code || '';
    const isAr = lang === 'ar';

    // Explicit mappings for common codes
    if (code.includes('invalid-credential') || code.includes('wrong-password')) {
        return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
    }
    if (code.includes('user-not-found')) {
        return isAr ? 'لا يوجد حساب مسجل لهذا البريد الإلكتروني.' : 'No account found for this email.';
    }
    if (code.includes('email-already-in-use')) {
        return isAr ? 'هذا البريد الإلكتروني مستخدم بالفعل.' : 'This email is already in use.';
    }
    if (code.includes('weak-password')) {
        return isAr ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' : 'Password must be at least 6 characters.';
    }
    if (code.includes('popup-closed-by-user')) {
        return isAr ? 'تم إلغاء تسجيل الدخول عبر Google.' : 'Google sign-in was cancelled.';
    }
    if (code.includes('network-request-failed')) {
        return isAr ? 'فشل الاتصال بالشبكة. يرجى التحقق من الإنترنت.' : 'Network error. Please check your internet connection.';
    }
    if (code.includes('too-many-requests')) {
        return isAr ? 'تم حظر الطلبات مؤقتاً بسبب كثرة المحاولات. يرجى المحاولة لاحقاً.' : 'Access temporarily blocked due to many failed attempts. Try again later.';
    }
    if (code.includes('operation-not-allowed')) {
        return isAr ? 'طريقة تسجيل الدخول هذه غير مفعلة.' : 'This sign-in method is not enabled.';
    }

    // Generic fallback with code for debugging
    console.error('Auth Error Details:', err);
    const fallbackMsg = isAr ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'Authentication failed. Please try again.';
    return code ? `${fallbackMsg} (${code})` : fallbackMsg;
};

const copy = {
    en: {
        welcomeBack: 'Welcome Back',
        heroText: 'Manage inventory, orders, customers, and analytics from one dashboard.',
        signIn: 'Sign in',
        createAccount: 'Create account',
        loginHint: 'Use your email/password or continue with Google.',
        continueGoogle: 'Continue with Google',
        or: 'or',
        email: 'Email',
        password: 'Password',
        placeholderEmail: 'you@example.com',
        placeholderPassword: 'Enter your password',
        pleaseWait: 'Please wait...',
        dontHave: "Don't have an account?",
        haveAccount: 'Already have an account?',
        createOne: 'Create one',
        switchSignIn: 'Sign in',
        language: 'العربية',
        unauthorizedTitle: 'Access Denied',
        unauthorizedMessage: "Your email is not registered in our system. Please contact the website admin to grant you access.",
    },
    ar: {
        welcomeBack: 'مرحبًا بعودتك',
        heroText: 'إدارة المخزون والطلبات والعملاء والتحليلات من لوحة واحدة.',
        signIn: 'تسجيل الدخول',
        createAccount: 'إنشاء حساب',
        loginHint: 'استخدم البريد/كلمة المرور أو المتابعة عبر Google.',
        continueGoogle: 'المتابعة باستخدام Google',
        or: 'أو',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        placeholderEmail: 'you@example.com',
        placeholderPassword: 'أدخل كلمة المرور',
        pleaseWait: 'يرجى الانتظار...',
        dontHave: 'ليس لديك حساب؟',
        haveAccount: 'لديك حساب بالفعل؟',
        createOne: 'إنشاء حساب',
        switchSignIn: 'تسجيل الدخول',
        language: 'English',
        unauthorizedTitle: 'تم رفض الوصول',
        unauthorizedMessage: 'بريدك الإلكتروني غير مسجل في نظامنا. يرجى الاتصال بمسؤول الموقع لمنحك حق الوصول.',
    },
};

const Login = () => {
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser } = useAuth();
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const from = useMemo(() => location.state?.from?.pathname || '/', [location.state]);
    const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    const tr = copy[lang];

    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isLangOpen, setIsLangOpen] = useState(false);

    const setAppLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    if (user) return <Navigate to={from} replace />;

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();

            // 1. Check if email is in the allowed list first if possible
            // Note: If Firestore rules are tight, this might fail until signed in.
            // So we'll check after sign-in for simplicity and consistency.

            if (mode === 'signup') {
                const allowedUser = await dataClient.getUserByEmail(normalizedEmail);
                if (!allowedUser) {
                    setError(tr.unauthorizedMessage);
                    setSubmitting(false);
                    return;
                }
                await signUpWithEmail(normalizedEmail, password);
            } else {
                try {
                    await signInWithEmail(normalizedEmail, password);
                } catch (signinErr) {
                    // Check if they are in the allowed list but haven't created an account yet
                    if (signinErr.code === 'auth/user-not-found' || signinErr.code === 'auth/invalid-credential') {
                        const isAllowed = await dataClient.getUserByEmail(normalizedEmail).catch(() => null);
                        if (isAllowed) {
                            setError(lang === 'ar' ? 'بريدك الإلكتروني معتمد، ولكن لم يتم إنشاء حسابك بعد. يرجى استخدام علامة تبويب "إنشاء حساب".' : 'Your email is authorized, but your account hasn\'t been created yet. Please use the "Create Account" tab.');
                            setSubmitting(false);
                            return;
                        }
                    }
                    throw signinErr; // Fall through to standard error handling
                }

                // Double check allowed list after successful sign in for extra security
                const allowedUser = await dataClient.getUserByEmail(normalizedEmail);
                if (!allowedUser) {
                    await signOutUser();
                    setError(tr.unauthorizedMessage);
                    setSubmitting(false);
                    return;
                }
            }
            navigate(from, { replace: true });
        } catch (err) {
            setError(formatAuthError(err, lang));
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setSubmitting(true);
        try {
            const result = await signInWithGoogle();
            const userEmail = result.user.email?.toLowerCase().trim();

            if (!userEmail) {
                setError(lang === 'ar' ? 'لم نتمكن من الحصول على بريدك الإلكتروني من Google.' : 'Failed to get email from Google.');
                setSubmitting(false);
                return;
            }

            const allowedUser = await dataClient.getUserByEmail(userEmail);
            if (!allowedUser) {
                await signOutUser();
                setError(tr.unauthorizedMessage);
                setSubmitting(false);
                return;
            }

            navigate(from, { replace: true });
        } catch (err) {
            setError(formatAuthError(err, lang));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50" dir={lang === 'ar' ? 'ltr' : 'ltr'}>
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                <div className="relative hidden lg:flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#243b6f] to-[#8b5cf6] p-10">
                    <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
                    <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-pink-400/25 blur-2xl" />
                    <div className="relative max-w-md text-white text-right">
                        <h1 className="text-5xl font-black leading-tight">{tr.welcomeBack}</h1>
                        <p className="mt-4 text-lg text-white/80">{tr.heroText}</p>
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10">
                    <div className={`w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-8 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <div className={`mb-8 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            <div className="mb-3 flex justify-end relative">
                                <button
                                    type="button"
                                    onClick={() => setIsLangOpen((v) => !v)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    <span>{lang === 'ar' ? '🇮🇶' : '🇬🇧'}</span>
                                    <span>{lang === 'ar' ? 'العربية' : 'English'}</span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isLangOpen && (
                                    <div className="absolute top-full mt-2 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-20">
                                        <button
                                            type="button"
                                            onClick={() => { setAppLanguage('en'); setIsLangOpen(false); }}
                                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                        >
                                            <span>🇬🇧</span>
                                            English
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAppLanguage('ar'); setIsLangOpen(false); }}
                                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                        >
                                            <span>🇮🇶</span>
                                            العربية
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-3xl font-black text-slate-900">{mode === 'signin' ? tr.signIn : tr.createAccount}</h2>
                            <p className="mt-2 text-sm text-slate-500">{tr.loginHint}</p>
                        </div>

                        {error && (
                            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogle}
                            disabled={submitting}
                            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <GoogleIcon />
                            {tr.continueGoogle}
                        </button>

                        <div className="mb-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tr.or}</span>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <form onSubmit={handleEmailSubmit} className="space-y-3">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{tr.email}</span>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white py-3 ps-10 pe-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                        placeholder={tr.placeholderEmail}
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{tr.password}</span>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white py-3 ps-10 pe-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                        placeholder={tr.placeholderPassword}
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? tr.pleaseWait : mode === 'signup' ? tr.createAccount : tr.signIn}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-500">
                            {mode === 'signin' ? tr.dontHave : tr.haveAccount}{' '}
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                                className="font-bold text-indigo-600 hover:text-indigo-700"
                            >
                                {mode === 'signin' ? tr.createOne : tr.switchSignIn}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
