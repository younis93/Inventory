import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Search } from 'lucide-react';
import ProductImageModal from '../components/ProductImageModal';
import ImageWithFallback from '../components/common/ImageWithFallback';
import Skeleton from '../components/common/Skeleton';

const ProductPicture = () => {
    const { t } = useTranslation();
    const { products, updateProduct, loading, isDesktop, isOnline, addToast, setIsModalOpen: setGlobalModalOpen } = useInventory();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Sync to global modal state
    useEffect(() => {
        setGlobalModalOpen(!!selectedProduct);
        return () => setGlobalModalOpen(false);
    }, [selectedProduct, setGlobalModalOpen]);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    const handleSaveProduct = async (updatedProduct, stayOpen = false) => {
        await updateProduct(updatedProduct);
        if (!stayOpen) {
            setSelectedProduct(null);
        }
    };

    const handleUploadImages = async (files) => {
        if (isDesktop && !isOnline) {
            addToast('Image upload is disabled while offline. Reconnect and try again.', 'warning');
            return [];
        }

        // Handle both raw File objects and pre-processed {url, name} objects
        const newImages = await Promise.all(files.map(async (file) => {
            if (file.url) return file; // Already processed

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({
                    url: reader.result,
                    name: file.name
                });
                reader.readAsDataURL(file);
            });
        }));

        if (selectedProduct) {
            const updatedImages = [...(selectedProduct.images || []), ...newImages];
            const updatedProduct = { ...selectedProduct, images: updatedImages };

            // Optimistically update
            setSelectedProduct(updatedProduct);
            // Persist
            await updateProduct(updatedProduct);
        }

        return newImages;
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout title={t('productPicture.title')}>
            {/* Sticky Search Bar area */}
            <div className="sticky top-14 sm:top-16 md:top-0 z-40 bg-slate-50/90 dark:bg-slate-900/95 backdrop-blur-xl -mx-4 md:-mx-8 px-4 md:px-8 py-3 md:py-4 mb-3 md:mb-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col md:flex-row items-center justify-start gap-3 md:gap-4">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('products.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full ps-10 pe-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                            <Skeleton className="aspect-[4/5] w-full rounded-2xl mb-4" />
                            <div className="px-1 space-y-2">
                                <Skeleton className="h-5 w-3/4 rounded-lg" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => {
                        // Determine main image logic
                        const imageUrl = product.images && product.images[0]
                            ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
                            : (product.image || 'https://via.placeholder.com/400x400?text=No+Image');

                        return (
                            <div
                                key={product._id || product.id}
                                onClick={() => handleProductClick(product)}
                                className="group bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-accent"
                            >
                                {/* Image Area */}
                                <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                                    <ImageWithFallback
                                        src={imageUrl}
                                        alt={product.name}
                                        className="w-full h-full"
                                        imageClassName="transition-transform duration-700 group-hover:scale-110"
                                    />

                                    {/* Badge Logic (Example) */}
                                    {product.stock <= 5 && (
                                        <div className="absolute top-3 start-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md">
                                            {t('products.stockStatus.lowStock')}
                                        </div>
                                    )}

                                    {/* Overlay on Hover */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>

                                {/* Content */}
                                <div className="mt-4 px-1">
                                    <h3 className="font-bold text-slate-800 dark:text-white truncate text-base mb-1 group-hover:text-accent transition-colors">
                                        {product.name}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                                            {product.sku || 'NO-SKU'}
                                        </span>
                                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-lg">
                                            {product.category || 'General'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filteredProducts.length === 0 && !loading && (
                <div className="text-center py-20 text-slate-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>{t('productPicture.noProducts')}</p>
                </div>
            )}

            {/* Modal */}
            {selectedProduct && (
                <ProductImageModal
                    product={selectedProduct}
                    onClose={handleCloseModal}
                    onSave={handleSaveProduct}
                    onUpload={handleUploadImages}
                />
            )}
        </Layout>
    );
};

export default ProductPicture;
