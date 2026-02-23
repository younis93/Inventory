import React, { useEffect, useRef, useState } from 'react';
import { Globe, ImagePlus, Save, Trash2 } from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebase';
import { useSettings } from '../../context/InventoryContext';
import { useInventory } from '../../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import ImageCropperModal from '../ImageCropperModal';
import ImageWithFallback from '../common/ImageWithFallback';

const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
};
const isDataUrlImage = (value) => /^data:image\/[a-zA-Z]+;base64,/.test(String(value || ''));
const withTimeout = (promise, timeoutMs = 20000) =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('upload-timeout')), timeoutMs))
    ]);
const STORAGE_UPLOAD_DISABLED_KEY = 'inventory.branding.storageUploadDisabled';
const readStorageUploadDisabled = () => {
    try {
        return localStorage.getItem(STORAGE_UPLOAD_DISABLED_KEY) === '1';
    } catch (_) {
        return false;
    }
};
const writeStorageUploadDisabled = (disabled) => {
    try {
        if (disabled) localStorage.setItem(STORAGE_UPLOAD_DISABLED_KEY, '1');
        else localStorage.removeItem(STORAGE_UPLOAD_DISABLED_KEY);
    } catch (_) { }
};
const resizeDataUrl = async (dataUrl, maxSize, quality = 0.82) => {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image-load-failed'));
        img.src = dataUrl;
    });

    const sourceWidth = image.naturalWidth || image.width || maxSize;
    const sourceHeight = image.naturalHeight || image.height || maxSize;
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
};

const BrandingSettings = () => {
    const { t } = useTranslation();
    const { brand, updateBrand } = useSettings();
    const { addToast } = useInventory();

    const [brandForm, setBrandForm] = useState({
        name: brand.name || '',
        color: brand.color || '#1e3a5f',
        logo: brand.logo || '',
        favicon: brand.favicon || '',
        website: brand.website || '',
        hideHeader: brand.hideHeader || false
    });
    const [saving, setSaving] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null);
    const [cropType, setCropType] = useState(null); // logo | favicon
    const logoInputRef = useRef(null);
    const faviconInputRef = useRef(null);

    useEffect(() => {
        setBrandForm({
            name: brand.name || '',
            color: brand.color || '#1e3a5f',
            logo: brand.logo || '',
            favicon: brand.favicon || '',
            website: brand.website || '',
            hideHeader: brand.hideHeader || false
        });
    }, [brand]);

    const handlePickFile = (event, target) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            addToast('Please select an image file.', 'error');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            addToast('File too large. Max 3MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropType(target);
            setCroppingImage(reader.result);
        };
        reader.onerror = () => addToast('Failed to read image.', 'error');
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const uploadCroppedAsset = async (dataUrl, target) => {
        const blob = await dataUrlToBlob(dataUrl);
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const path = `branding/${target}-${Date.now()}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/png' });
        return getDownloadURL(storageRef);
    };

    const handleCropComplete = (croppedDataUrl) => {
        if (!cropType) return;
        // Keep Apply Changes instant; upload happens on Save Branding.
        setBrandForm((prev) => ({ ...prev, [cropType]: croppedDataUrl }));
        addToast(`${cropType === 'logo' ? 'Logo' : 'Favicon'} updated. Click Save Branding to persist.`, 'success');
        setCropType(null);
        setCroppingImage(null);
    };

    const uploadAssetIfNeeded = async (value, target) => {
        if (!value) return '';
        if (!isDataUrlImage(value)) return value;

        const optimizedDataUrl = await resizeDataUrl(
            value,
            target === 'favicon' ? 128 : 512,
            target === 'favicon' ? 0.8 : 0.82
        );

        if (readStorageUploadDisabled()) {
            return optimizedDataUrl;
        }

        try {
            const uploadedUrl = await withTimeout(uploadCroppedAsset(optimizedDataUrl, target), 2000);
            writeStorageUploadDisabled(false);
            return uploadedUrl;
        } catch (error) {
            // If storage is blocked in this environment, skip retries in next saves.
            writeStorageUploadDisabled(true);
            return optimizedDataUrl;
        }
    };

    const handleSave = async () => {
        if (!brandForm.name.trim()) {
            addToast('App name is required.', 'error');
            return;
        }

        setSaving(true);
        try {
            const logo = await uploadAssetIfNeeded(brandForm.logo, 'logo');
            const favicon = await uploadAssetIfNeeded(brandForm.favicon, 'favicon');

            await updateBrand({
                ...brandForm,
                logo,
                favicon,
                name: brandForm.name.trim(),
                website: brandForm.website.trim()
            });
            setBrandForm((prev) => ({ ...prev, logo, favicon }));
            addToast(t('settings.toasts.brandingSaved'), 'success');
        } catch (error) {
            console.error(error);
            addToast(`Failed to save branding settings (${error?.code || error?.message || 'unknown'}).`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.branding')}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('settings.appName')}</span>
                    <input
                        type="text"
                        value={brandForm.name}
                        onChange={(event) => setBrandForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                </label>

                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('settings.customColor')}</span>
                    <input
                        type="color"
                        value={brandForm.color || '#1e3a5f'}
                        onChange={(event) => setBrandForm((prev) => ({ ...prev, color: event.target.value }))}
                        className="w-full h-12 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    />
                </label>

                <label className="space-y-1 lg:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Website</span>
                    <div className="relative">
                        <Globe className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="url"
                            placeholder="https://example.com"
                            value={brandForm.website}
                            onChange={(event) => setBrandForm((prev) => ({ ...prev, website: event.target.value }))}
                            className="w-full ps-9 pe-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                    </div>
                </label>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.logoAndFavicon')}</h3>
                <div className="flex flex-wrap items-start gap-8">
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="relative w-28 h-28 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow"
                        >
                            <ImageWithFallback src={brandForm.logo} alt="Logo" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center text-white opacity-0 hover:opacity-100">
                                <ImagePlus className="w-5 h-5" />
                            </span>
                        </button>
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t('settings.logo')}</span>
                            {brandForm.logo && (
                                <button
                                    type="button"
                                    onClick={() => setBrandForm((prev) => ({ ...prev, logo: '' }))}
                                    className="text-red-500 hover:text-red-600"
                                    aria-label={t('settings.removeLogo')}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => faviconInputRef.current?.click()}
                            className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow"
                        >
                            <ImageWithFallback src={brandForm.favicon || brandForm.logo} alt="Favicon" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center text-white opacity-0 hover:opacity-100">
                                <ImagePlus className="w-4 h-4" />
                            </span>
                        </button>
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Favicon</span>
                            {brandForm.favicon && (
                                <button
                                    type="button"
                                    onClick={() => setBrandForm((prev) => ({ ...prev, favicon: '' }))}
                                    className="text-red-500 hover:text-red-600"
                                    aria-label={t('settings.removeFavicon')}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-sm text-slate-500">{t('settings.logoSize')}</div>
                </div>

                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePickFile(event, 'logo')} />
                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePickFile(event, 'favicon')} />
            </div>

            <label className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.appHeader')}</p>
                    <p className="text-xs text-slate-500">{t('settings.appHeaderDesc')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setBrandForm((prev) => ({ ...prev, hideHeader: !prev.hideHeader }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${brandForm.hideHeader ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${brandForm.hideHeader ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </label>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-3 text-white font-bold rounded-xl bg-accent shadow-accent disabled:opacity-60"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : t('settings.saveBranding')}
                </button>
            </div>

            {croppingImage && (
                <ImageCropperModal
                    image={croppingImage}
                    onCrop={handleCropComplete}
                    onClose={() => {
                        setCroppingImage(null);
                        setCropType(null);
                    }}
                    aspect={1}
                />
            )}
        </div>
    );
};

export default BrandingSettings;
