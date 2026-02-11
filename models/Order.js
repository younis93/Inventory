const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    customer: { type: String, required: true },
    date: { type: Date, default: Date.now },
    total: { type: Number, required: true },
    status: { type: String, default: 'Pending' }, // Pending, Processing, Completed
    items: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
