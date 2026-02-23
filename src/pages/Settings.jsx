import React, { useEffect, useMemo, useState } from 'react';
import { Palette, Settings as SettingsIcon, Sparkles, User, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AccountSettings from '../components/settings/AccountSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import BrandingSettings from '../components/settings/BrandingSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import UserManagement from '../components/settings/UserManagement';
import { useSettings } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';

const allTabs = ['general', 'appearance', 'branding', 'account', 'users'];

const Settings = () => {
    const { t } = useTranslation();
    const { currentUser } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('general');

    const restrictedTabs = useMemo(() => {
        const role = currentUser?.role || 'Sales';
        if (role === 'Sales') return ['branding', 'users'];
        if (role === 'Manager') return ['branding'];
        return [];
    }, [currentUser?.role]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (!tab || !allTabs.includes(tab) || restrictedTabs.includes(tab)) {
            setActiveTab('general');
            setSearchParams({ tab: 'general' }, { replace: true });
            return;
        }
        setActiveTab(tab);
    }, [restrictedTabs, searchParams, setSearchParams]);

    const tabs = useMemo(() => ([
        { id: 'general', label: t('settings.general'), icon: SettingsIcon, hidden: false },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette, hidden: false },
        { id: 'branding', label: t('settings.branding'), icon: Sparkles, hidden: restrictedTabs.includes('branding') },
        { id: 'account', label: t('settings.account'), icon: User, hidden: false },
        { id: 'users', label: t('settings.users'), icon: Users, hidden: restrictedTabs.includes('users') }
    ]), [restrictedTabs, t]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab }, { replace: true });
    };

    const renderTabContent = () => {
        if (activeTab === 'appearance') return <AppearanceSettings />;
        if (activeTab === 'branding') return <BrandingSettings />;
        if (activeTab === 'account') return <AccountSettings />;
        if (activeTab === 'users') return <UserManagement />;
        return <GeneralSettings />;
    };

    return (
        <Layout title={t('settings.title')}>
            <div className="flex flex-col lg:flex-row gap-6">
                <aside className="w-full lg:w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <nav className="space-y-2">
                        {tabs.filter((tab) => !tab.hidden).map((tab) => {
                            const Icon = tab.icon;
                            const selected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${selected
                                        ? 'bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/80 text-white shadow-md shadow-[var(--brand-color)]/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <div className="flex-1">
                    {renderTabContent()}
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
