import React, { forwardRef } from 'react';
import { useInventory } from '../context/InventoryContext';

const ReceiptPDF = forwardRef(({ order }, ref) => {
    const { brand, formatCurrency } = useInventory();

    if (!order) return null;

    const subtotal = order.subtotal || order.total || 0;
    const discountAmount = order.discount ? (subtotal * (order.discount / 100)) : 0;
    const total = order.total || 0;
    const accentColor = brand.color || '#1e3a5f';

    const hexToRgba = (hex, alpha) => {
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } catch {
            return `rgba(30, 58, 95, ${alpha})`;
        }
    };

    const formatDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = d.toLocaleString('en-US', { month: 'long' });
            const day = d.getDate();
            return `${year}-${month}-${day}`;
        } catch {
            return dateStr;
        }
    };

    return (
        <div
            ref={ref}
            style={{
                fontFamily: "'Cairo', 'Segoe UI', Arial, sans-serif",
                background: '#ffffff',
                color: '#1a1a2e',
                width: '210mm',
                minHeight: '297mm',
                padding: '0',
                margin: '0',
                boxSizing: 'border-box',
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @page { margin: 0; size: A4; }
                }
                tr { page-break-inside: avoid; }
            `}} />

            {/* TOP ACCENT BAR */}
            <div style={{
                height: '8px',
                background: `linear-gradient(90deg, ${accentColor} 0%, ${hexToRgba(accentColor, 0.6)} 100%)`,
                width: '100%',
            }} />

            {/* HEADER */}
            <div style={{
                padding: '28px 36px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: `1px solid ${hexToRgba(accentColor, 0.15)}`,
            }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {brand.logo && (
                        <img
                            src={brand.logo}
                            alt="Logo"
                            style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    )}
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: accentColor, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                            {brand.name}
                        </div>
                        {brand.website && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>
                                {brand.website.replace(/^https?:\/\//, '')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoice title bilingual */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '36px', fontWeight: '900', color: accentColor, letterSpacing: '-1px', lineHeight: 1, textTransform: 'uppercase' }}>
                        INVOICE
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: hexToRgba(accentColor, 0.7), marginTop: '2px', direction: 'rtl' }}>
                        فاتورة
                    </div>
                </div>
            </div>

            {/* META INFO BAND */}
            <div style={{
                background: hexToRgba(accentColor, 0.05),
                borderBottom: `1px solid ${hexToRgba(accentColor, 0.1)}`,
                padding: '14px 36px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
            }}>
                {/* Invoice No. + Date */}
                <div style={{ display: 'flex', gap: '32px' }}>
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '3px' }}>
                            Invoice No. / رقم الفاتورة
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: accentColor }}>
                            {order.orderId}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '3px' }}>
                            Date / التاريخ
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                            {formatDate(order.date)}
                        </div>
                    </div>
                </div>

                {/* Customer info */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '3px' }}>
                        Billed To / إلى العميل
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                        {order.customer?.name}
                    </div>
                    {order.customer?.phone && (
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '1px' }}>
                            📞 {order.customer.phone}
                        </div>
                    )}
                    {order.customer?.governorate && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '1px' }}>
                            📍 {order.customer.governorate}
                        </div>
                    )}
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div style={{ padding: '24px 36px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ background: accentColor }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontWeight: '700', fontSize: '10px', width: '36px' }}>
                                #
                            </th>
                            <th style={{ padding: '10px 12px', color: '#fff', fontWeight: '700', fontSize: '10px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Description</span>
                                    <span style={{ direction: 'rtl', opacity: 0.85 }}>الوصف</span>
                                </div>
                            </th>
                            <th style={{ padding: '10px 12px', color: '#fff', fontWeight: '700', fontSize: '10px', textAlign: 'center', width: '60px' }}>
                                <div>Qty</div>
                                <div style={{ direction: 'rtl', opacity: 0.85, fontSize: '9px' }}>الكمية</div>
                            </th>
                            <th style={{ padding: '10px 12px', color: '#fff', fontWeight: '700', fontSize: '10px', textAlign: 'right', width: '110px' }}>
                                <div>Unit Price</div>
                                <div style={{ direction: 'rtl', opacity: 0.85, fontSize: '9px' }}>سعر الوحدة</div>
                            </th>
                            <th style={{ padding: '10px 12px', color: '#fff', fontWeight: '700', fontSize: '10px', textAlign: 'right', width: '110px' }}>
                                <div>Total</div>
                                <div style={{ direction: 'rtl', opacity: 0.85, fontSize: '9px' }}>الإجمالي</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items?.map((item, index) => (
                            <tr
                                key={index}
                                style={{
                                    background: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                                    borderBottom: '1px solid #e2e8f0',
                                }}
                            >
                                <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: '700', fontSize: '11px' }}>
                                    {index + 1}
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>
                                    {item.product?.name}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#334155' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>
                                    {formatCurrency(item.price)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#1e293b' }}>
                                    {formatCurrency(item.price * item.quantity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALS + NOTES */}
            <div style={{ padding: '20px 36px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
                {/* Notes / Shipping */}
                <div style={{ flex: 1 }}>
                    {order.notes && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', maxWidth: '260px' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '6px' }}>
                                Notes / ملاحظات
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6, fontStyle: 'italic' }}>
                                {order.notes}
                            </div>
                        </div>
                    )}
                    {order.customer?.shippingAddress && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', maxWidth: '260px', marginTop: order.notes ? '8px' : '0' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '4px' }}>
                                Shipping / الشحن
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {order.customer.shippingAddress}
                            </div>
                        </div>
                    )}
                </div>

                {/* Totals */}
                <div style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Subtotal</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>/ المجموع</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{formatCurrency(subtotal)}</span>
                    </div>

                    {order.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626' }}>Discount ({order.discount}%)</span>
                                <span style={{ fontSize: '10px', color: '#f87171', marginLeft: '6px' }}>/ خصم</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}

                    {order.paymentMethod && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Payment</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>/ الدفع</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>{order.paymentMethod}</span>
                        </div>
                    )}

                    {/* Grand Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', marginTop: '8px', background: accentColor, borderRadius: '10px' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '1px' }}>Grand Total</div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', direction: 'rtl' }}>الإجمالي الكلي</div>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
                            {formatCurrency(total)}
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ borderTop: `2px solid ${hexToRgba(accentColor, 0.15)}`, padding: '16px 36px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${accentColor} 0%, ${hexToRgba(accentColor, 0.4)} 100%)` }} />
                <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: accentColor }}>Thank you for your Purchase!</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: hexToRgba(accentColor, 0.8), marginTop: '2px', direction: 'rtl' }}>شكراً على شرائكم</div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '4px' }}>
                        Items sold are non-refundable &nbsp;·&nbsp; البضاعة المباعة لا ترد ولا تستبدل
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: accentColor }}>{brand.name}</div>
                    {brand.website && (
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            {brand.website.replace(/^https?:\/\//, '')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ReceiptPDF.displayName = 'ReceiptPDF';
export default ReceiptPDF;
