import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/InventoryContext';
import { useInventory } from '../../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import ImageCropperModal from '../ImageCropperModal';
import ImageWithFallback from '../common/ImageWithFallback';
import { useModalA11y } from '../../hooks/useModalA11y';

const isStrongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(value || ''));

const AccountSettings = () => {
    const { t } = useTranslation();
    const { user: authUser, updateAuthProfile, updateAuthAvatar, changeAuthPassword } = useAuth();
    const { currentUser, updateUserProfile } = useSettings();
    const { addToast } = useInventory();

    const [displayName, setDisplayName] = useState(authUser?.displayName || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const changePasswordDialogRef = useRef(null);

    useModalA11y({
        isOpen: isChangePasswordOpen,
        onClose: () => setIsChangePasswordOpen(false),
        containerRef: changePasswordDialogRef
    });

    useEffect(() => {
        setDisplayName(authUser?.displayName || '');
    }, [authUser?.displayName]);

    const accountAvatar = currentUser?.photoURL || authUser?.photoURL || '';
    const authUsername = authUser?.email ? authUser.email.split('@')[0] : '';

    const handleAvatarSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            addToast(t('settings.toasts.avatarTooLarge'), 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setCroppingImage(reader.result);
        reader.onerror = () => addToast('Failed to read image.', 'error');
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleCropComplete = async (croppedDataUrl) => {
        try {
            const photoURL = await updateAuthAvatar(croppedDataUrl);
            await updateUserProfile({ photoURL });
            addToast('Avatar updated successfully!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to update avatar.', 'error');
        } finally {
            setCroppingImage(null);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const name = displayName.trim();
            if (!name) {
                addToast('Display name is required.', 'error');
                return;
            }
            await updateAuthProfile({ displayName: name });
            await updateUserProfile({ displayName: name });
            setIsEditingProfile(false);
            addToast(t('settings.toasts.profileUpdated'), 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to update profile.', 'error');
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            addToast('New passwords do not match.', 'error');
            return;
        }
        if (!isStrongPassword(passwordForm.newPassword)) {
            addToast('Use at least 8 chars with upper, lower, number, and symbol.', 'error');
            return;
        }
        try {
            await changeAuthPassword(passwordForm.currentPassword, passwordForm.newPassword);
            addToast(t('settings.toasts.passwordChanged'), 'success');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setIsChangePasswordOpen(false);
        } catch (error) {
            console.error(error);
            addToast('Failed to change password. Verify your current password.', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.accountSettings')}</h2>

            <div className="flex flex-wrap items-center gap-4">
                <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center text-3xl font-bold text-accent overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                    {accountAvatar ? (
                        <ImageWithFallback src={accountAvatar} alt={displayName || authUsername} className="w-full h-full" imageClassName="w-full h-full object-cover" />
                    ) : (
                        (displayName || authUsername || 'U').charAt(0).toUpperCase()
                    )}
                </div>
                <div className="space-y-2">
                    <label className="cursor-pointer px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all inline-block bg-accent">
                        {t('settings.changeAvatar')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                    </label>
                    <p className="text-xs text-slate-500">{t('settings.avatarRecommendedSize')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('settings.displayName')}</span>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        disabled={!isEditingProfile}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900"
                    />
                </label>
                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('settings.username')}</span>
                    <input
                        type="text"
                        value={authUsername}
                        disabled
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/60"
                    />
                </label>
                <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('settings.emailAddress')}</span>
                    <input
                        type="email"
                        value={authUser?.email || ''}
                        disabled
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/60"
                    />
                </label>
            </div>

            <div className="flex flex-wrap gap-3">
                {!isEditingProfile ? (
                    <button type="button" onClick={() => setIsEditingProfile(true)} className="px-5 py-2.5 text-white font-bold rounded-xl bg-accent shadow-accent inline-flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t('settings.editProfile')}
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={handleSaveProfile} className="px-5 py-2.5 text-white font-bold rounded-xl bg-accent shadow-accent inline-flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {t('settings.saveChanges')}
                        </button>
                        <button type="button" onClick={() => { setDisplayName(authUser?.displayName || ''); setIsEditingProfile(false); }} className="hidden px-5 py-2.5 font-bold rounded-xl border border-slate-200 dark:border-slate-700 sm:inline-flex">
                            {t('common.cancel')}
                        </button>
                    </>
                )}
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-accent" />
                        {t('settings.securitySettings')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{t('settings.passwordDescription')}</p>
                </div>
                <button type="button" onClick={() => setIsChangePasswordOpen(true)} className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-xl">
                    {t('settings.changePassword')}
                </button>
            </div>

            {isChangePasswordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div
                        ref={changePasswordDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="change-password-title"
                        tabIndex={-1}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
                    >
                        <h3 id="change-password-title" className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t('settings.changePassword')}</h3>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <input required placeholder={t('settings.placeholders.currentPassword')} type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                            <input required placeholder={t('settings.placeholders.newPassword')} type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                            <input required placeholder={t('settings.placeholders.confirmPassword')} type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" />

                            <p className="text-[11px] text-slate-500">Password must include upper/lowercase letters, a number, and a symbol.</p>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel')}</button>
                                <button type="submit" className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg bg-accent">{t('settings.changePassword')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {croppingImage && (
                <ImageCropperModal
                    image={croppingImage}
                    onCrop={handleCropComplete}
                    onClose={() => setCroppingImage(null)}
                    aspect={1}
                />
            )}
        </div>
    );
};

export default AccountSettings;
