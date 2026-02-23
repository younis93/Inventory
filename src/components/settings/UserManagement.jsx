import React, { useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Edit,
    Info,
    Plus,
    ShieldAlert,
    Trash2,
    X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useInventory, useSettings } from '../../context/InventoryContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import DeleteConfirmModal from '../common/DeleteConfirmModal';
import ImageWithFallback from '../common/ImageWithFallback';
import SearchableSelect from '../SearchableSelect';

const isStrongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(value || ''));

const defaultUserForm = {
    displayName: '',
    username: '',
    email: '',
    role: 'Sales',
    password: ''
};

const UserManagement = () => {
    const { t } = useTranslation();
    const { user: authUser } = useAuth();
    const { addToast } = useInventory();
    const { users, currentUser, addUser, updateUser, deleteUser } = useSettings();

    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState(defaultUserForm);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const addUserDialogRef = useRef(null);

    useModalA11y({
        isOpen: isAddUserModalOpen,
        onClose: () => setIsAddUserModalOpen(false),
        containerRef: addUserDialogRef
    });

    const currentRole = currentUser?.role || 'Sales';

    const filteredUsers = useMemo(() => {
        if (currentRole === 'Admin' || currentRole === 'Manager') {
            return users;
        }
        return users.filter((user) => user.email === authUser?.email);
    }, [authUser?.email, currentRole, users]);

    const roleOptions = useMemo(() => ([
        { value: 'Sales', label: 'Sales' },
        ...(currentRole === 'Admin' ? [{ value: 'Manager', label: 'Manager' }] : []),
        ...(currentRole === 'Admin' ? [{ value: 'Admin', label: 'Admin' }] : [])
    ]), [currentRole]);

    const handleOpenAddUser = () => {
        setEditingUser(null);
        setUserForm({ ...defaultUserForm, role: currentRole === 'Admin' ? 'Sales' : 'Sales' });
        setIsAddUserModalOpen(true);
    };

    const handleOpenEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            displayName: user.displayName || '',
            username: user.username || '',
            email: user.email || '',
            role: user.role || 'Sales',
            password: ''
        });
        setIsAddUserModalOpen(true);
    };

    const handleUserSubmit = async (event) => {
        event.preventDefault();

        const payload = {
            ...userForm,
            displayName: userForm.displayName.trim(),
            username: userForm.username.trim(),
            email: userForm.email.trim()
        };

        if (!editingUser) {
            if (!payload.password) {
                addToast('Password is required when creating a user.', 'error');
                return;
            }
            if (!isStrongPassword(payload.password)) {
                addToast('Password must be 8+ chars with upper, lower, number, and symbol.', 'error');
                return;
            }
        } else if (payload.password && !isStrongPassword(payload.password)) {
            addToast('Password must be 8+ chars with upper, lower, number, and symbol.', 'error');
            return;
        }

        try {
            if (editingUser) {
                const updatePayload = { ...payload, _id: editingUser._id };
                if (!updatePayload.password) {
                    delete updatePayload.password;
                }
                await updateUser(updatePayload);
                addToast(t('settings.toasts.userUpdated'), 'success');
            } else {
                await addUser(payload);
                addToast(t('settings.toasts.userCreated'), 'success');
            }
            setIsAddUserModalOpen(false);
        } catch (error) {
            console.error('User management error:', error);
            addToast('Failed to save user.', 'error');
        }
    };

    const handleDeleteUser = (id) => {
        setUserToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await deleteUser(userToDelete);
            addToast('User deleted successfully.', 'success');
        } catch (error) {
            console.error('Delete user error:', error);
            addToast('Failed to delete user.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.users')}</h2>
                    <button
                        type="button"
                        onClick={handleOpenAddUser}
                        className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-xl transition-colors shadow-lg bg-accent"
                    >
                        <Plus className="w-5 h-5" />
                        {t('settings.addUser')}
                    </button>
                </div>

                <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.user')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.authStatus')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.role')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.lastLogin')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredUsers.map((user) => {
                                const canManage = currentRole === 'Admin' || (currentRole === 'Manager' && user.role === 'Sales');
                                const isSelf = user.email === authUser?.email;

                                return (
                                    <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm">
                                                    {user.photoURL ? (
                                                        <ImageWithFallback src={user.photoURL} alt={user.displayName} className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-accent text-white font-bold">
                                                            {user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{user.displayName}</div>
                                                    <div className="text-[10px] text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {user.uid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {t('common.verified')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/50">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {t('common.pending')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditUser(user)}
                                                        className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                                                        aria-label={`Edit ${user.displayName}`}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canManage && !isSelf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user._id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        aria-label={`Delete ${user.displayName}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="sm:hidden space-y-4">
                    {filteredUsers.map((user) => {
                        const canManage = currentRole === 'Admin' || (currentRole === 'Manager' && user.role === 'Sales');
                        const isSelf = user.email === authUser?.email;

                        return (
                            <div key={user._id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                                            {user.photoURL ? (
                                                <ImageWithFallback src={user.photoURL} alt={user.displayName} className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-accent text-white font-bold text-lg">
                                                    {user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white">{user.displayName}</h4>
                                                {user.uid && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                        {user.role}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[10px] text-slate-400 italic">
                                        {user.lastLogin ? `${t('settings.table.lastLogin')}: ${new Date(user.lastLogin).toLocaleDateString()}` : t('common.noData')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditUser(user)}
                                                className="p-2.5 text-accent bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90"
                                                aria-label={`Edit ${user.displayName}`}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canManage && !isSelf && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="p-2.5 text-red-500 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90"
                                                aria-label={`Delete ${user.displayName}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div
                        ref={addUserDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-user-title"
                        tabIndex={-1}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 id="add-user-title" className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingUser ? t('settings.editUser') : t('settings.addNewUser')}
                            </h3>
                            <button
                                type="button"
                                aria-label={t('common.close') || 'Close'}
                                onClick={() => setIsAddUserModalOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.placeholders.displayName')}</label>
                                    <input
                                        required
                                        placeholder={t('settings.placeholders.displayName')}
                                        value={userForm.displayName}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, displayName: event.target.value }))}
                                        className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.placeholders.username')}</label>
                                    <input
                                        required
                                        placeholder={t('settings.placeholders.username')}
                                        value={userForm.username}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                                        className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.placeholders.email')}</label>
                                    <input
                                        required
                                        placeholder={t('settings.placeholders.email')}
                                        type="email"
                                        value={userForm.email}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                                        className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.table.role')}</label>
                                    <SearchableSelect
                                        title={t('common.select')}
                                        options={roleOptions}
                                        selectedValue={userForm.role}
                                        onChange={(value) => setUserForm((prev) => ({ ...prev, role: value }))}
                                        icon={ShieldAlert}
                                        showSearch={false}
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        {editingUser ? t('settings.placeholders.passwordKeep') : t('settings.placeholders.password')}
                                    </label>
                                    <input
                                        placeholder={editingUser ? t('settings.placeholders.passwordKeep') : t('settings.placeholders.password')}
                                        type="password"
                                        value={userForm.password}
                                        onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                                        className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                        required={!editingUser}
                                    />
                                    <p className="mt-1.5 ml-1 flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent/70" />
                                        {t('settings.passwordHint')}
                                    </p>
                                    <p className="mt-1 ml-1 flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-orange-500" />
                                        Use 8+ chars with uppercase, lowercase, number, and symbol.
                                    </p>
                                </div>

                                {!editingUser && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] leading-relaxed text-blue-700 dark:text-blue-300 font-medium">
                                            {t('settings.signupNotice')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg bg-accent"
                                >
                                    {editingUser ? t('settings.updateUser') : t('settings.createUser')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeleteUser}
                title="Delete User"
                message={t('settings.confirmDeleteUser')}
            />
        </>
    );
};

export default UserManagement;
