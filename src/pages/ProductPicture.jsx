import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useInventory, useProducts } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Search } from 'lucide-react';
import ProductImageModal from '../components/ProductImageModal';
import ImageWithFallback from '../components/common/ImageWithFallback';
import Skeleton from '../components/common/Skeleton';

const ProductPicture = () => {
    const { t } = useTranslation();
    const { products, updateProduct } = useProducts();
    const { loading, isDesktop, isOnline, addToast, setIsModalOpen: setGlobalModalOpen } = useInventory();
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

        const newImages = await Promise.all(files.map(async (file) => {
            if (file.url) return file;

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
            setSelectedProduct(updatedProduct);
            await updateProduct(updatedProduct);
        }

        return newImages;
    };

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const filteredProducts = useMemo(() => {
        if (!normalizedSearchTerm) return products;
        return products.filter((product) => {
            const name = String(product.name || '').toLowerCase();
            const sku = String(product.sku || '').toLowerCase();
            return name.includes(normalizedSearchTerm) || sku.includes(normalizedSearchTerm);
        });
    }, [products, normalizedSearchTerm]);

    return (
        <Layout title={t('productPicture.title')} hideHeader={true} fullWidth={true}>
            {/* Sticky Search Bar area - pins flush to the top of the scroll container */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 md:px-8 py-4 md:py-6 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-col md:flex-row items-center justify-start gap-4 shadow-sm">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-4">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('products.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full ps-10 pe-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
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
                            const imageUrl = product.images && product.images[0]
                                ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
                                : (product.image || 'https://via.placeholder.com/400x400?text=No+Image');

                            return (
                                <div
                                    key={product._id || product.id}
                                    onClick={() => handleProductClick(product)}
                                    className="group bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-accent"
                                >
                                    <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                                        <ImageWithFallback
                                            src={imageUrl}
                                            alt={product.name}
                                            className="w-full h-full"
                                            imageClassName="transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {product.stock <= 0 ? (
                                            <div className="absolute top-3 start-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-10">
                                                {t('products.stockStatus.outOfStock')}
                                            </div>
                                        ) : product.stock <= 10 ? (
                                            <div className="absolute top-3 start-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-10 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                {t('products.stockStatus.lowStock')}: {product.stock}
                                            </div>
                                        ) : null}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    </div>
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
            </div>

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
