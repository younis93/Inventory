import React, { useState, useEffect } from 'react'; // Added useEffect
import Layout from '../components/Layout';
import { Moon, Sun, Monitor, User, Trash2, Plus, CheckCircle, Settings as SettingsIcon, Users, Lock, Edit, Upload, Image as ImageIcon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const Settings = () => {
    const { theme, toggleTheme, users, addUser, updateUser, deleteUser, currentUser, updateUserProfile, brand, updateBrand } = useInventory();
    const [activeTab, setActiveTab] = useState('general');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Account Settings State
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Update local state when currentUser changes
    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName);
        }
    }, [currentUser]);

    const handleSaveProfile = async () => {
        try {
            await updateUserProfile({ displayName });
            setIsEditingProfile(false);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Profile update error:", error);
            alert("Failed to update profile.");
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) return alert("Avatar too large. Max 500KB.");
            const reader = new FileReader();
            reader.onloadend = async () => {
                await updateUserProfile({ photoURL: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const [brandForm, setBrandForm] = useState({
        name: brand.name,
        color: brand.color,
        logo: brand.logo,
        hideHeader: brand.hideHeader || false
    });

    useEffect(() => {
        setBrandForm({
            name: brand.name,
            color: brand.color,
            logo: brand.logo,
            hideHeader: brand.hideHeader || false
        });
    }, [brand]);

    const handleSaveBranding = async () => {
        try {
            await updateBrand(brandForm);
            alert("Branding settings saved successfully!");
        } catch (error) {
            alert("Failed to save branding settings.");
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) return alert("File too large. Max 1MB.");
            const reader = new FileReader();
            reader.onloadend = () => {
                setBrandForm(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // User Management State
    const [userForm, setUserForm] = useState({ username: '', email: '', role: 'Staff', password: '', displayName: '' });

    const handleOpenAddUser = () => {
        setEditingUser(null);
        setUserForm({ username: '', email: '', role: 'Staff', password: '', displayName: '' });
        setIsAddUserModalOpen(true);
    };

    const handleOpenEditUser = (user) => {
        setEditingUser(user);
        setUserForm({ ...user, password: '' }); // Don't pre-fill password for security
        setIsAddUserModalOpen(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser({ ...userForm, _id: editingUser._id });
                alert("User updated successfully!");
            } else {
                await addUser({ ...userForm });
                alert("User created successfully!");
            }
            setIsAddUserModalOpen(false);
        } catch (error) {
            console.error("User management error:", error);
            alert("Failed to save user.");
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await deleteUser(id);
                alert("User deleted.");
            } catch (error) {
                alert("Failed to delete user.");
            }
        }
    };

    return (
        <Layout title="Settings">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-left font-medium transition-colors ${activeTab === 'general' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            style={activeTab === 'general' ? { backgroundColor: `${brand.color}15`, color: brand.color } : {}}
                        >
                            <SettingsIcon className="w-5 h-5" /> General
                        </button>
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-left font-medium transition-colors ${activeTab === 'account' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            style={activeTab === 'account' ? { backgroundColor: `${brand.color}15`, color: brand.color } : {}}
                        >
                            <User className="w-5 h-5" /> Account
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-left font-medium transition-colors ${activeTab === 'users' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            style={activeTab === 'users' ? { backgroundColor: `${brand.color}15`, color: brand.color } : {}}
                        >
                            <Users className="w-5 h-5" /> Users
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-left font-medium transition-colors ${activeTab === 'security' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            style={activeTab === 'security' ? { backgroundColor: `${brand.color}15`, color: brand.color } : {}}
                        >
                            <Lock className="w-5 h-5" /> Security
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'general' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">General Settings</h2>

                            <div className="space-y-6">
                                {/* Theme Settings */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Theme</h3>
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => toggleTheme('light')}
                                            className={`flex flex-col items-center p-4 rounded-xl border-2 ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} transition-all`}
                                        >
                                            <Sun className={`w-6 h-6 mb-2 ${theme === 'light' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                            <span className={`text-sm font-medium ${theme === 'light' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Light</span>
                                        </button>
                                        <button
                                            onClick={() => toggleTheme('dark')}
                                            className={`flex flex-col items-center p-4 rounded-xl border-2 ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} transition-all`}
                                        >
                                            <Moon className={`w-6 h-6 mb-2 ${theme === 'dark' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Dark</span>
                                        </button>
                                        <button
                                            onClick={() => toggleTheme('system')}
                                            className={`flex flex-col items-center p-4 rounded-xl border-2 ${theme === 'system' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} transition-all`}
                                        >
                                            <Monitor className={`w-6 h-6 mb-2 ${theme === 'system' ? 'text-indigo-600' : 'text-slate-500'}`} />
                                            <span className={`text-sm font-medium ${theme === 'system' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>System</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Header Visibility toggle */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Application Header</h3>
                                            <p className="text-xs text-slate-500">Show or hide the top navigation header</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const newVal = !brandForm.hideHeader;
                                                setBrandForm(prev => ({ ...prev, hideHeader: newVal }));
                                                await updateBrand({ ...brand, hideHeader: newVal });
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                                            style={{ backgroundColor: !brandForm.hideHeader ? brand.color : '#e2e8f0' }}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!brandForm.hideHeader ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Branding Settings */}
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Branding</h3>
                                    <button
                                        onClick={handleSaveBranding}
                                        className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95"
                                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                    >
                                        Save Branding Settings
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* App Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Application Name</label>
                                        <input
                                            type="text"
                                            value={brandForm.name}
                                            onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                                            className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>

                                    {/* Brand Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={brandForm.color}
                                                onChange={(e) => setBrandForm({ ...brandForm, color: e.target.value })}
                                                className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 overflow-hidden"
                                            />
                                            <span className="text-slate-500 dark:text-slate-400 font-mono">{brandForm.color}</span>
                                        </div>
                                    </div>

                                    {/* Logo Upload */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Logo</label>
                                        <div className="flex items-center gap-6">
                                            <div
                                                className="w-20 h-20 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600 overflow-hidden bg-slate-100 dark:bg-slate-800"
                                                style={{ backgroundColor: brandForm.color }}
                                            >
                                                {brandForm.logo ? (
                                                    <img src={brandForm.logo} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-bold text-2xl">{brandForm.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium text-sm">
                                                    <Upload className="w-4 h-4" />
                                                    <span>Upload Logo</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Recommended size: 512x512px. Max 1MB.</p>
                                                {brandForm.logo && (
                                                    <button
                                                        onClick={() => setBrandForm({ ...brandForm, logo: null })}
                                                        className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
                                                    >
                                                        Remove Logo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Account Settings</h2>

                            <div className="max-w-xl space-y-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                                        {currentUser?.photoURL ? (
                                            <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            currentUser?.displayName?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div>
                                        <label
                                            className="cursor-pointer px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all inline-block hover:scale-[1.02]"
                                            style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                        >
                                            Change Avatar
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        disabled={!isEditingProfile}
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={currentUser?.username || ''}
                                        readOnly
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={currentUser?.email || ''}
                                        readOnly
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    {!isEditingProfile ? (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg"
                                            style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                        >
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setDisplayName(currentUser?.displayName || '');
                                                    setIsEditingProfile(false);
                                                }}
                                                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg"
                                                style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">User Management</h2>
                                <button
                                    onClick={handleOpenAddUser}
                                    className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-xl transition-colors shadow-lg"
                                    style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                >
                                    <Plus className="w-5 h-5" /> Add User
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Username</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Display Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {users.map((user) => (
                                            <tr key={user._id}>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{user.username}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.displayName}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.role}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenEditUser(user)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Security Settings</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Password</h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4">Change your account password.</p>
                                    <button
                                        onClick={() => setIsChangePasswordOpen(true)}
                                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 transition-all"
                                    >
                                        Change Password
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Two-Factor Authentication (2FA)</h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4">Add an extra layer of security to your account.</p>
                                    <button
                                        className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg"
                                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                    >
                                        Enable 2FA
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {
                isAddUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <form onSubmit={handleUserSubmit} className="space-y-4">
                                <input required placeholder="Display Name" value={userForm.displayName} onChange={e => setUserForm({ ...userForm, displayName: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder="Username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder="Email" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none">
                                    <option value="Manager">Manager</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <input placeholder={editingUser ? "Password (leave blank to keep)" : "Password"} type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" required={!editingUser} />

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                    <button type="submit"
                                        className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg"
                                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                    >
                                        {editingUser ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Change Password Modal */}
            {
                isChangePasswordOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Change Password</h3>
                            <form onSubmit={(e) => { e.preventDefault(); alert("Password changed successfully (Mock)"); setIsChangePasswordOpen(false); }} className="space-y-4">
                                <input required placeholder="Current Password" type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder="New Password" type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder="Confirm New Password" type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                    <button type="submit"
                                        className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg"
                                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                    >Change Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </Layout >
    );
};

export default Settings;
