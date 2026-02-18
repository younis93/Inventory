import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Download, Save, ZoomIn, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2, Tag } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import ImageWithFallback from './common/ImageWithFallback';

const ImageSlider = ({ images, currentIndex, onChange, onDelete, onDownload }) => {
    const { t } = useTranslation();

    const safeIndex = images.length > 0 ? (currentIndex < images.length ? currentIndex : 0) : 0;
    const currentImage = images[safeIndex];
    const imageUrl = (typeof currentImage === 'string' ? currentImage : currentImage?.url) || 'https://via.placeholder.com/600';

    if (!images || images.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-400">{t('productPicture.modal.noImages')}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col group">
            {/* Main Preview Container - Fixed height to prevent layout shifts */}
            <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-lg w-full">
                {/* Blurred Backdrop Layer */}
                {imageUrl && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img
                            src={imageUrl}
                            alt=""
                            className="w-full h-full object-cover blur-3xl opacity-50 scale-125 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-white/20 dark:bg-black/40" />
                    </div>
                )}

                <ImageWithFallback
                    key={imageUrl}
                    src={imageUrl}
                    alt="Product"
                    className="w-full h-full flex items-center justify-center relative z-10 bg-transparent"
                    imageClassName="w-auto h-auto max-w-full max-h-full object-contain drop-shadow-2xl"
                />

                {/* Overlay Controls */}
                <div className="absolute top-4 left-4 flex gap-2 z-30">
                    <button
                        onClick={onDownload}
                        className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg backdrop-blur transition-all shadow-md border border-slate-200/50 dark:border-slate-700/50"
                        title={t('common.download')}
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(safeIndex)}
                        className="p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-lg backdrop-blur transition-all shadow-md border border-red-400/20"
                        title={t('common.delete')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Slider Nav */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => onChange((safeIndex - 1 + images.length) % images.length)}
                            className="absolute left-4 top-[55%] md:top-1/2 -translate-y-1/2 p-2.5 md:p-3 bg-slate-900/40 hover:bg-slate-900/60 text-white rounded-full backdrop-blur-md transition-all z-20 shadow-lg border border-white/10"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button
                            onClick={() => onChange((safeIndex + 1) % images.length)}
                            className="absolute right-4 top-[55%] md:top-1/2 -translate-y-1/2 p-2.5 md:p-3 bg-slate-900/40 hover:bg-slate-900/60 text-white rounded-full backdrop-blur-md transition-all z-20 shadow-lg border border-white/10"
                        >
                            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-2 mt-6 px-2 overflow-x-auto py-2 hide-scrollbar">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => onChange(idx)}
                            className={`w-12 h-12 rounded-xl border-2 transition-all flex-shrink-0 bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${idx === safeIndex ? 'border-accent ring-2 ring-accent/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            <ImageWithFallback
                                src={typeof img === 'string' ? img : img?.url}
                                alt={`Thumb ${idx}`}
                                className="w-full h-full"
                                imageClassName="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductImageModal = ({ product, onClose, onSave, onUpload }) => {
    const { t } = useTranslation();
    const { formatCurrency, isSidebarCollapsed } = useInventory();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [editedTitle, setEditedTitle] = useState(product.name || '');
    const [editedDescription, setEditedDescription] = useState(product.description || '');
    const [images, setImages] = useState(product.images || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        // Esc key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        // Sync state if product changes (e.g. switching between products)
        // We use product._id to avoid re-syncing when local edits update the parent list
        setEditedTitle(product.name || '');
        setEditedDescription(product.description || '');
        setImages(product.images || []);
        setCurrentImageIndex(0);
    }, [product._id]);

    const handleSave = async () => {
        if (!editedTitle.trim()) return;

        setIsSaving(true);
        try {
            await onSave({
                ...product,
                name: editedTitle,
                description: editedDescription,
                images: images
            });
        } catch (error) {
            console.error("Failed to save product:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Helper to compress and convert to base64
            const processFile = (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const max_size = 1200; // Limit max resolution for performance

                            if (width > height) {
                                if (width > max_size) {
                                    height *= max_size / width;
                                    width = max_size;
                                }
                            } else {
                                if (height > max_size) {
                                    width *= max_size / height;
                                    height = max_size;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve({
                                url: canvas.toDataURL('image/jpeg', 0.8), // Quality 0.8
                                name: file.name
                            });
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            };

            try {
                const processedImages = await Promise.all(files.map(processFile));

                if (onUpload) {
                    // onUpload handles persistence
                    const result = await onUpload(processedImages);
                    if (result) {
                        setImages(prev => [...prev, ...result]);
                    }
                } else {
                    // Local only
                    setImages(prev => [...prev, ...processedImages]);
                }
            } catch (error) {
                console.error("Image processing failed:", error);
            }
        }
    };

    const confirmDeleteImage = () => {
        setIsDeleteModalOpen(true);
    };

    const handleDeleteImage = () => {
        const index = currentImageIndex;
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);

        // Adjust current index if needed
        if (currentImageIndex >= newImages.length && newImages.length > 0) {
            setCurrentImageIndex(newImages.length - 1);
        } else if (newImages.length === 0) {
            setCurrentImageIndex(0);
        }

        setIsDeleteModalOpen(false);
        // Note: We no longer auto-save here, per user request.
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 transition-all ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-56'}`}>
            {/* Click outside to close - only active on desktop for safety */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-white dark:bg-slate-800 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in slide-in-from-bottom-10 duration-500">

                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-16 right-8 md:top-4 md:right-4 z-[150] p-2 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200 text-slate-500 dark:text-slate-400 rounded-lg transition-all active:scale-95 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur shadow-sm"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left: Image Slider & Actions */}
                    <div className="w-full h-[70vh] md:h-auto md:w-2/3 bg-slate-100 dark:bg-slate-900/50 flex flex-col p-4 pt-12 md:p-6 overflow-hidden relative">
                        <div className="flex-1 min-h-0">
                            <ImageSlider
                                images={images}
                                currentIndex={currentImageIndex}
                                onChange={(idx) => setCurrentImageIndex(idx)}
                                onDelete={() => confirmDeleteImage()}
                                onDownload={downloadImage}
                            />
                        </div>

                        {/* Centered Add Photo Action */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                            <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-accent text-white rounded-2xl text-sm font-black hover:brightness-110 cursor-pointer transition-all shadow-xl shadow-accent/20 active:scale-95">
                                <Plus className="w-5 h-5" />
                                <span>{t('productPicture.modal.addPhoto')}</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    {/* Right: Product Details & Edit */}
                    <div className="w-full md:w-1/3 flex-1 p-6 md:p-8 flex flex-col bg-white dark:bg-slate-800 md:border-l border-slate-100 dark:border-slate-700 overflow-y-auto scrollbar-none">
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

                <DeleteConfirmModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteImage}
                    title={t('common.delete')}
                    message={t('productPicture.modal.confirmDeleteImage')}
                />
            </div>
        </div>
    );
};

export default ProductImageModal;
