/**
 * CSV Export Utility
 * Provides functions to export data to CSV format with Excel compatibility
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of header names (if not provided, uses object keys)
 * @returns {string} CSV formatted string
 */
const convertToCSV = (data, headers = null) => {
    if (!data || data.length === 0) {
        return '';
    }

    // Use provided headers or extract from first object
    const csvHeaders = headers || Object.keys(data[0]);

    // Create header row
    const headerRow = csvHeaders.map(header => `"${header}"`).join(',');

    // Create data rows
    const dataRows = data.map(item => {
        return csvHeaders.map(header => {
            let value = item[header];

            // Handle nested objects
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }

            // Handle null/undefined
            if (value === null || value === undefined) {
                value = '';
            }

            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file with BOM for Excel compatibility
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Filename for download
 */
const downloadCSV = (csvContent, filename) => {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    URL.revokeObjectURL(url);
};

/**
 * Export orders to CSV with customer information
 * @param {Array} orders - Array of order objects
 * @param {string} filename - Optional filename (default: orders_export_YYYYMMDD.csv)
 */
export const exportOrdersToCSV = (orders, filename = null) => {
    if (!orders || orders.length === 0) {
        return;
    }

    // Flatten order data with customer information
    const flattenedOrders = orders.map(order => ({
        'Order ID': order.orderId || order._id,
        'Date': order.date,
        'Status': order.status,
        'Customer Name': order.customer?.name || '',
        'Customer Phone': order.customer?.phone || '',
        'Customer Email': order.customer?.email || '',
        'Customer Address': order.customer?.address || '',
        'Governorate': order.customer?.governorate || '',
        'Social Platform': order.customer?.social || '',
        'Items Count': order.items?.length || 0,
        'Subtotal': order.subtotal || order.total,
        'Discount %': order.discount || 0,
        'Total': order.total,
        'Notes': order.notes || ''
    }));

    const csvContent = convertToCSV(flattenedOrders);
    const defaultFilename = filename || `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, defaultFilename);
};

/**
 * Export customers to CSV
 * @param {Array} customers - Array of customer objects
 * @param {string} filename - Optional filename (default: customers_export_YYYYMMDD.csv)
 */
export const exportCustomersToCSV = (customers, filename = null) => {
    if (!customers || customers.length === 0) {
        return;
    }

    // Format customer data
    const formattedCustomers = customers.map(customer => ({
        'Name': customer.name,
        'Phone': customer.phone,
        'Email': customer.email || '',
        'Address': customer.address || '',
        'Governorate': customer.governorate || '',
        'Social Platform': customer.social || '',
        'Notes': customer.notes || '',
        'Created On': customer.createdOn || ''
    }));

    const csvContent = convertToCSV(formattedCustomers);
    const defaultFilename = filename || `customers_export_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, defaultFilename);
};

/**
 * Export products to CSV
 * @param {Array} products - Array of product objects
 * @param {string} filename - Optional filename
 */
export const exportProductsToCSV = (products, filename = null) => {
    if (!products || products.length === 0) {
        return;
    }

    const formattedProducts = products.map(p => ({
        'Name': p.name,
        'SKU': p.sku,
        'Category': p.category,
        'Stock': p.stock,
        'Status': p.status,
        'Selling Price (IQD)': p.sellingPriceIQD || p.price,
        'Unit Price ($)': p.unitPriceUSD || p.unitPrice,
        'Profit per Unit (IQD)': p.profitPerUnitIQD || 0,
        'Units Sold': p.unitsSold || 0,
        'Total Profit (IQD)': p.totalProfitIQD || 0
    }));

    const csvContent = convertToCSV(formattedProducts);
    const defaultFilename = filename || `products_export_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, defaultFilename);
};

/**
 * Export expenses to CSV
 * @param {Array} expenses - Array of expense objects
 * @param {string} filename - Optional filename
 */
export const exportExpensesToCSV = (expenses, filename = null) => {
    if (!expenses || expenses.length === 0) {
        return;
    }

    const formattedExpenses = expenses.map((expense) => ({
        'Date': expense.date || '',
        'Type': expense.type || '',
        'Campaign': expense.campaign || '',
        'Amount (IQD)': expense.amountIQD || 0,
        'Link': expense.link || '',
        'Tags': Array.isArray(expense.tags) ? expense.tags.join(', ') : (expense.tags || ''),
        'Attachments': Array.isArray(expense.attachments) ? expense.attachments.map((a) => a?.name || a?.url).filter(Boolean).join(' | ') : '',
        'Notes': expense.notes || ''
    }));

    const csvContent = convertToCSV(formattedExpenses);
    const defaultFilename = filename || `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, defaultFilename);
};

export default {
    convertToCSV,
    downloadCSV,
    exportOrdersToCSV,
    exportCustomersToCSV,
    exportProductsToCSV,
    exportExpensesToCSV
};
