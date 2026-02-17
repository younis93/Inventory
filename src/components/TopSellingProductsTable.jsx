import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Package, User, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const TopSellingProductsTable = ({ products, orders, formatCurrency }) => {
    // 1. Calculating sales per product based on the passed (filtered) orders
    const productSales = React.useMemo(() => {
        const salesMap = {}; // { productId: { ...product, totalSales: 0, orderCount: 0, distinctOrders: [] } }

        // Initialize with all products (use _id if present)
        products.forEach(p => {
            const pid = p._id || p.id || p.id_str || p.sku || p.name;
            salesMap[pid] = { ...p, _id: pid, totalSales: 0, orderCount: 0, distinctOrders: [] };
        });

        // Iterate orders
        orders.forEach(order => {
            if (!order.items) return;
            order.items.forEach(item => {
                const productId = item.product?._id || item.productId; // Fallback
                if (productId && salesMap[productId]) {
                    salesMap[productId].totalSales += (item.price * item.quantity);
                    salesMap[productId].orderCount += item.quantity;
                    salesMap[productId].distinctOrders.push({
                        id: order._id || order.id,
                        customer: order.customer?.name || (order.customer || ''),
                        date: order.date || order.createdAt || order.updatedAt,
                        quantity: item.quantity,
                        total: item.price * item.quantity
                    });
                }
            });
        });

        return Object.values(salesMap)
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 10); // Limit to top 10 products
    }, [products, orders]);

    const [expandedProductId, setExpandedProductId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedProductId(expandedProductId === id ? null : id);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-accent" /> Top Selling Products
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                            <th className="py-3 ps-2">Product Name</th>
                            <th className="py-3 text-center">Sales</th>
                            <th className="py-3 text-end pe-2">Total Revenue</th>
                            <th className="py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {productSales.filter(p => p.orderCount > 0).map((product) => (
                            <React.Fragment key={product._id}>
                                <tr
                                    onClick={() => toggleExpand(product._id)}
                                    className={`group cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${expandedProductId === product._id ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                                >
                                    <td className="py-4 ps-2 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                                            <img src={product.images?.[0] || 'https://via.placeholder.com/40'} alt={product.name || 'Product image'} className="w-full h-full object-cover" />
                                        </div>
                                        {product.name}
                                    </td>
                                    <td className="py-4 text-center text-slate-600 dark:text-slate-300">
                                        <span
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black transition-all"
                                            style={{
                                                backgroundColor: `color-mix(in srgb, var(--accent-color), transparent 90%)`,
                                                color: `var(--accent-color)`
                                            }}
                                        >
                                            {product.orderCount} Orders
                                        </span>
                                    </td>
                                    <td className="py-4 text-end pe-2 font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(product.totalSales)}
                                    </td>
                                    <td className="py-4 text-center text-slate-400 group-hover:text-accent">
                                        {expandedProductId === product._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </td>
                                </tr>
                                {/* Expanded Details */}
                                {expandedProductId === product._id && (
                                    <tr>
                                        <td colSpan="4" className="bg-slate-50/50 dark:bg-slate-900/30 p-4">
                                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase flex justify-between">
                                                    <span>Order Details ({product.distinctOrders.length})</span>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                    {product.distinctOrders.map((orderDetail, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                                        <User className="w-3 h-3 text-slate-400" /> {orderDetail.customer}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                                        <Calendar className="w-3 h-3" /> {orderDetail.date && !isNaN(new Date(orderDetail.date).getTime()) ? format(new Date(orderDetail.date), 'dd MMM yyyy') : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-end">
                                                                <span className="block text-xs font-bold text-slate-800 dark:text-white">
                                                                    Qty: {orderDetail.quantity}
                                                                </span>
                                                                <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(orderDetail.total)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {product.distinctOrders.length === 0 && (
                                                        <div className="text-center py-4 text-slate-400 text-xs">No order details available</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {productSales.filter(p => p.orderCount > 0).length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-slate-400">No sales data matches current filters</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopSellingProductsTable;
