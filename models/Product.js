import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0.00 },
    status: { type: String, default: 'In Stock' }, // In Stock, Low Stock, Out of Stock
    image: { type: String } // URL to image
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
