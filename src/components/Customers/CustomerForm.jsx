import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, MapPin, X } from 'lucide-react';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../../constants/iraq';
import SearchableSelect from '../SearchableSelect';
import { useModalA11y } from '../../hooks/useModalA11y';

const normalizePhone = (value) => String(value || '').replace(/[^\d]/g, '');
const isValidIraqPhone = (value) => /^07\d{9}$/.test(normalizePhone(value));
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const CustomerForm = ({
    isOpen,
    appearanceTheme,
    t,
    editingCustomer,
    formData,
    setFormData,
    onSubmit,
    onClose
}) => {
    const dialogRef = useRef(null);
    const [showValidation, setShowValidation] = useState(false);

    useModalA11y({
        isOpen,
        onClose,
        containerRef: dialogRef
    });

    useEffect(() => {
        if (isOpen) setShowValidation(false);
    }, [isOpen]);

    const validationErrors = useMemo(() => {
        const errors = {};
        if (!String(formData.name || '').trim()) {
            errors.name = 'Full name is required.';
        }
        if (!String(formData.phone || '').trim()) {
            errors.phone = 'Phone number is required.';
        } else if (!isValidIraqPhone(formData.phone)) {
            errors.phone = 'Use a valid Iraqi phone number (07XXXXXXXXX).';
        }
        if (String(formData.email || '').trim() && !isValidEmail(formData.email)) {
            errors.email = 'Please enter a valid email address.';
        }
        if (!String(formData.governorate || '').trim()) {
            errors.governorate = 'Governorate is required.';
        }
        if (!String(formData.social || '').trim()) {
            errors.social = 'Channel is required.';
        }
        if (!String(formData.address || '').trim()) {
            errors.address = 'Shipping address is required.';
        }
        return errors;
    }, [formData.address, formData.email, formData.governorate, formData.name, formData.phone, formData.social]);
    const hasValidationErrors = Object.keys(validationErrors).length > 0;
    const shouldShowError = (field) => showValidation || Boolean(formData[field]);

    const handleFormSubmit = (event) => {
        event.preventDefault();
        setShowValidation(true);
        if (hasValidationErrors) return;
        onSubmit(event);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-stretch sm:items-start justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-form-title"
                tabIndex={-1}
                className={`rounded-[32px] shadow-2xl w-full max-w-md my-0 sm:my-8 h-[calc(100dvh-1rem)] sm:h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 relative ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}
            >
                <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 z-10 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/20 dark:bg-slate-900/20 backdrop-blur-md' : 'bg-white dark:bg-slate-800'}`}>
                    <div>
                        <h3 id="customer-form-title" className="text-xl font-black text-slate-900 dark:text-white">{editingCustomer ? t('customers.form.edit') : t('customers.form.new')}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('customers.form.sub')}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('common.close') || 'Close'} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 p-5 overflow-y-auto custom-scrollbar">
                    <form id="customer-form" onSubmit={handleFormSubmit} className="space-y-4">
                        {showValidation && hasValidationErrors && (
                            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold">
                                Please fix the highlighted fields before saving.
                            </div>
                        )}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.fullName')}</label>
                                <input
                                    required
                                    placeholder="Ahmed Ali"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    aria-invalid={Boolean(validationErrors.name) && shouldShowError('name')}
                                    className={`w-full p-2.5 border-2 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${Boolean(validationErrors.name) && shouldShowError('name') ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'} ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                />
                                {Boolean(validationErrors.name) && shouldShowError('name') && (
                                    <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.name}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.phone')}</label>
                                    <input
                                        required
                                        placeholder="07XX XXX XXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        aria-invalid={Boolean(validationErrors.phone) && shouldShowError('phone')}
                                        className={`w-full p-2.5 border-2 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${Boolean(validationErrors.phone) && shouldShowError('phone') ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'} ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                    />
                                    {Boolean(validationErrors.phone) && shouldShowError('phone') && (
                                        <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.phone}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.email')}</label>
                                    <input
                                        placeholder="customer@example.com"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        aria-invalid={Boolean(validationErrors.email) && shouldShowError('email')}
                                        className={`w-full p-2.5 border-2 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30 ${Boolean(validationErrors.email) && shouldShowError('email') ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'} ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                    />
                                    {Boolean(validationErrors.email) && shouldShowError('email') && (
                                        <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.email}</p>
                                    )}
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
                                    {Boolean(validationErrors.governorate) && shouldShowError('governorate') && (
                                        <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.governorate}</p>
                                    )}
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
                                    {Boolean(validationErrors.social) && shouldShowError('social') && (
                                        <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.social}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t('customers.form.shippingAddress')}</label>
                                <textarea
                                    rows="2"
                                    placeholder="Street name, landmark, house number..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    aria-invalid={Boolean(validationErrors.address) && shouldShowError('address')}
                                    className={`w-full p-2.5 border-2 rounded-2xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold resize-none placeholder:opacity-30 ${Boolean(validationErrors.address) && shouldShowError('address') ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'} ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900'}`}
                                />
                                {Boolean(validationErrors.address) && shouldShowError('address') && (
                                    <p className="text-[10px] font-semibold text-red-500 ms-1">{validationErrors.address}</p>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
                <div className={`px-6 pt-0 pb-8 sm:pb-6 mt-auto border-t border-slate-100 dark:border-slate-700 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/20 dark:bg-slate-900/20 backdrop-blur-md' : 'bg-white dark:bg-slate-800'}`}>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={() => document.getElementById('customer-form').requestSubmit()}
                            disabled={hasValidationErrors && showValidation}
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

export default CustomerForm;
