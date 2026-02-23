export const generateInvoiceHTML = ({ order, brand, formatCurrency }) => {
    const accentColor = brand?.color || '#1e3a5f';
    const brandName = brand?.name || 'Invoice';
    const brandLogo = brand?.logo || '';
    const brandWebsite = brand?.website || '';

    const subtotal = order.subtotal || order.total || 0;
    const discountAmount = order.discount ? subtotal * (order.discount / 100) : 0;
    const total = order.total || 0;

    const itemRows = (order.items || []).map((item, index) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;color:#94a3b8;font-weight:700;font-size:11px;">${index + 1}</td>
            <td style="padding:10px 12px;font-weight:600;color:#1e293b;font-size:12px;">${item.product?.name || ''}</td>
            <td style="padding:10px 12px;text-align:center;font-weight:700;">${item.quantity}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:600;color:#475569;">${formatCurrency(item.price)}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:800;color:#1e293b;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${order.orderId}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Segoe UI,Arial,sans-serif;background:#fff;color:#1a1a2e;}
.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;}
.header{padding:24px 36px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;}
.brand{display:flex;gap:12px;align-items:center;}
.band{padding:12px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;}
.table-wrap{padding:24px 36px 0;}
table{width:100%;border-collapse:collapse;font-size:12px;}
thead tr{background:${accentColor};}
thead th{padding:10px 12px;color:#fff;font-size:10px;text-align:left;}
.totals{padding:20px 36px;display:flex;justify-content:flex-end;}
.totals-box{min-width:220px;}
.totals-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;}
.grand{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-top:8px;background:${accentColor};color:#fff;border-radius:10px;font-weight:800;}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="brand">
            ${brandLogo ? `<img src="${brandLogo}" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:50%;"/>` : ''}
            <div>
                <div style="font-size:22px;font-weight:900;color:${accentColor};">${brandName}</div>
                ${brandWebsite ? `<div style="font-size:11px;color:#94a3b8;">${brandWebsite.replace(/^https?:\/\//, '')}</div>` : ''}
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:34px;font-weight:900;color:${accentColor};">INVOICE</div>
            <div style="font-size:12px;color:#64748b;">${order.orderId}</div>
        </div>
    </div>
    <div class="band">
        <div>
            <div style="font-size:11px;color:#64748b;">Date</div>
            <div style="font-size:14px;font-weight:700;color:#334155;">${order.date}</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:11px;color:#64748b;">Billed To</div>
            <div style="font-size:14px;font-weight:700;color:#334155;">${order.customer?.name || ''}</div>
            <div style="font-size:11px;color:#64748b;">${order.customer?.phone || ''}</div>
        </div>
    </div>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Unit Price</th>
                    <th style="text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>
    </div>
    <div class="totals">
        <div class="totals-box">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(subtotal)}</span>
            </div>
            ${order.discount > 0 ? `
            <div class="totals-row" style="color:#dc2626;">
                <span>Discount (${order.discount}%)</span>
                <span>-${formatCurrency(discountAmount)}</span>
            </div>` : ''}
            <div class="grand">
                <span>Grand Total</span>
                <span style="font-size:22px;">${formatCurrency(total)}</span>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;
};

export const triggerPDFPrint = ({ order, brand, formatCurrency }) => {
    const html = generateInvoiceHTML({ order, brand, formatCurrency });
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const printReceipt = ({ order, brand, formatCurrency, t }) => {
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) return;

    const isRtl = document.dir === 'rtl';
    const brandWebsite = brand?.website || '';
    const brandName = brand?.name || t('orders.receipt.companyName');

    printWindow.document.write(`
        <html dir="${isRtl ? 'rtl' : 'ltr'}">
            <head>
                <title>${t('orders.receipt.title')}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; direction: ${isRtl ? 'rtl' : 'ltr'}; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header a { color: inherit; text-decoration: underline; font-size: 13px; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .divider { border-top: 1px dashed black; margin: 10px 0; }
                    .totals { text-align: ${isRtl ? 'left' : 'right'}; margin-top: 10px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; }
                    .discount { color: red; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${brandWebsite ? `<a href="${brandWebsite}" target="_blank">${brandName}</a>` : brandName}</h2>
                    ${brandWebsite ? `<p style="font-size:12px; color:#666;">${brandWebsite.replace(/^https?:\/\//, '')}</p>` : ''}
                    <p>${t('orders.receipt.order')}: ${order.orderId || '###'}</p>
                    <p>${order.date}</p>
                </div>
                <div class="divider"></div>
                <div>
                    <p><strong>${t('orders.receipt.customer')}:</strong> ${order.customer.name}</p>
                    <p><strong>${t('orders.receipt.phone')}:</strong> ${order.customer.phone || t('orders.receipt.na')}</p>
                    <p><strong>${t('orders.receipt.gov')}:</strong> ${order.customer.governorate || t('orders.receipt.na')}</p>
                </div>
                <div class="divider"></div>
                <div>
                    ${(order.items || []).map((item) => `
                        <div class="item">
                            <span>${item.product.name} <br> <small>x${item.quantity} @ ${formatCurrency(item.price)}</small></span>
                            <span>${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="divider"></div>
                <div class="totals">
                    <div class="total-row" style="font-weight: normal;">
                        <span>${t('orders.receipt.subtotal')}:</span>
                        <span>${formatCurrency(order.subtotal || order.total)}</span>
                    </div>
                    ${order.discount ? `
                    <div class="total-row discount" style="font-weight: normal;">
                        <span>${t('orders.receipt.discount')} (${order.discount}%):</span>
                        <span>-${formatCurrency((order.subtotal || order.total) - order.total)}</span>
                    </div>` : ''}
                    <div class="total-row" style="font-size: 18px; margin-top: 10px;">
                        <span>${t('orders.receipt.total')}:</span>
                        <span>${formatCurrency(order.total)}</span>
                    </div>
                </div>
                <div class="divider"></div>
                <div style="text-align: center; margin-top: 20px;">
                    <p>Thank you for your Purchase!</p>
                    <p>${t('orders.receipt.noReturn')}</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
