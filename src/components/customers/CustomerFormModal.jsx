import React from 'react';
import { Globe, MapPin, X } from 'lucide-react';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../../constants/iraq';
import SearchableSelect from '../SearchableSelect';

const CustomerFormModal = ({
    isOpen,
    appearanceTheme,
    t,
    editingCustomer,
    formData,
    setFormData,
    onSubmit,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
            <div className={`rounded-[32px] shadow-2xl w-full max-w-md my-4 sm:my-8 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 relative ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}>
                <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 z-10 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/20 dark:bg-slate-900/20 backdrop-blur-md' : 'bg-white dark:bg-slate-800'}`}>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingCustomer ? t('customers.form.edit') : t('customers.form.new')}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('customers.form.sub')}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    <form id="customer-form" onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.fullName')}</label>
                                <input
                                    required
                                    placeholder="Ahmed Ali"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full p-2.5 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.phone')}</label>
                                    <input
                                        required
                                        placeholder="07XX XXX XXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className={`w-full p-2.5 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.email')}</label>
                                    <input
                                        placeholder="customer@example.com"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full p-2.5 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.governorate')}</label>
                                    <SearchableSelect
                                        title={t('common.select')}
                                        options={GOVERNORATES.map((gov) => ({ value: gov, label: gov }))}
                                        selectedValue={formData.governorate}
                                        onChange={(value) => setFormData((prev) => ({ ...prev, governorate: value }))}
                                        icon={MapPin}
                                        showSearch={false}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.channel')}</label>
                                    <SearchableSelect
                                        title={t('common.select')}
                                        options={SOCIAL_PLATFORMS.map((platform) => ({ value: platform, label: platform }))}
                                        selectedValue={formData.social}
                                        onChange={(value) => setFormData((prev) => ({ ...prev, social: value }))}
                                        icon={Globe}
                                        showSearch={false}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.shippingAddress')}</label>
                                <textarea
                                    rows="2"
                                    placeholder="Street name, landmark, house number..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className={`w-full p-2.5 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold resize-none placeholder:opacity-30 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                />
                            </div>
                        </div>
                    </form>
                </div>
                <div className={`p-6 pt-0 mt-auto border-t border-slate-100 dark:border-slate-700 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/20 dark:bg-slate-900/20 backdrop-blur-md' : 'bg-white dark:bg-slate-800'}`}>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={() => document.getElementById('customer-form').requestSubmit()}
                            className="flex-2 py-3 text-white rounded-2xl font-black transition-all active:scale-95 bg-accent shadow-accent hover:brightness-110 flex-[2]"
                        >
                            {editingCustomer ? t('customers.form.save') : t('customers.form.register')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
