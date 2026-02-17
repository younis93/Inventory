import React, { useState, useEffect } from 'react';
import { X, Upload, Download, Save, ZoomIn, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2, Tag } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import ImageSlider from './ImageSlider';

const ProductImageModal = ({ product, onClose, onSave, onUpload }) => {
    const { t } = useTranslation();
    const { formatCurrency } = useInventory();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [editedTitle, setEditedTitle] = useState(product.name || '');
    const [editedDescription, setEditedDescription] = useState(product.description || '');
    const [images, setImages] = useState(product.images || []);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Esc key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        // Sync state if product changes
        setEditedTitle(product.name || '');
        setEditedDescription(product.description || '');
        setImages(product.images || []);
        setCurrentImageIndex(0);
    }, [product]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave({
            ...product,
            name: editedTitle,
            description: editedDescription,
            images: images
        });
        setIsSaving(false);
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newImages = await onUpload(Array.from(e.target.files));
            if (newImages) {
                setImages([...images, ...newImages]);
            }
        }
    };

    const handleDeleteImage = async (index) => {
        if (window.confirm(t('productPicture.modal.confirmDeleteImage'))) {
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);

            // Adjust current index if needed
            if (currentImageIndex >= newImages.length && newImages.length > 0) {
                setCurrentImageIndex(newImages.length - 1);
            } else if (newImages.length === 0) {
                setCurrentImageIndex(0);
            }

            // Save the change immediately
            setIsSaving(true);
            await onSave({
                ...product,
                images: newImages,
                name: editedTitle,
                description: editedDescription
            });
            setIsSaving(false);
        }
    };


    const currentImage = images.length > 0 ? images[currentImageIndex] : (product.images?.[0] || product.image);
    // Fallback for image object vs string
    const currentImageUrl = typeof currentImage === 'string' ? currentImage : currentImage?.url || 'https://via.placeholder.com/600';

    const downloadImage = () => {
        const link = document.createElement('a');
        link.href = currentImageUrl;
        link.download = `product-${product.sku}-${currentImageIndex}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black rounded-full text-slate-800 dark:text-white transition-all backdrop-blur"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left: Image Slider & Actions */}
                <div className="w-full md:w-2/3 bg-slate-100 dark:bg-slate-900 flex flex-col p-6 overflow-hidden">
                    <div className="flex-1 min-h-0">
                        <ImageSlider
                            images={images}
                            currentIndex={currentImageIndex}
                            onChange={setCurrentImageIndex}
                            onDelete={handleDeleteImage}
                            onDownload={downloadImage}
                        />
                    </div>

                    {/* Quick Upload Action */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {images.length} {t('productPicture.modal.images')}
                        </div>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-accent hover:border-accent cursor-pointer transition-all shadow-sm active:scale-95">
                            <Upload className="w-4 h-4" />
                            <span>{t('productPicture.modal.addPhoto')}</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>

                {/* Right: Product Details & Edit */}
                <div className="w-full md:w-1/3 p-6 flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700 overflow-y-auto">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-accent" />
                        {t('productPicture.modal.details')}
                    </h3>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('productPicture.modal.productTitle')}</label>
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
                                placeholder={t('productPicture.modal.enterTitle')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('productPicture.modal.description')}</label>
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-accent outline-none transition-all resize-none h-32"
                                placeholder={t('productPicture.modal.enterDescription')}
                            />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('productPicture.modal.sellingPrice')}</span>
                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                    {formatCurrency(product.sellingPriceIQD || product.price || 0)}
                                </span>
                            </div>
                            <div className="p-2 bg-accent/10 rounded-lg">
                                <Tag className="w-5 h-5 text-accent" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !editedTitle.trim()}
                            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl shadow-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {t('settings.saveChanges')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProductImageModal;
