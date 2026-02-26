const ReceiptTemplate = ({ order, brand, formatCurrency, t, isRtl }) => {
    const brandWebsite = brand?.website || '';
    const brandName = brand?.name || t('orders.receipt.companyName');

    return `
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
    `;
};

export const buildReceiptHTML = ({ order, brand, formatCurrency, t, isRtl }) =>
    ReceiptTemplate({ order, brand, formatCurrency, t, isRtl });

export default ReceiptTemplate;
