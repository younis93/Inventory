require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
// Replace with your actual MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_app';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Models
const Product = require('./models/Product');
const Order = require('./models/Order');

// API Routes

// 1. Get Dashboard Stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        // Calculate total inventory value
        const products = await Product.find();
        const inventoryValue = products.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);

        // Mock sales data for chart
        const salesTrend = [
            { name: 'Jan', sales: 4000 },
            { name: 'Feb', sales: 3000 },
            { name: 'Mar', sales: 2000 },
            { name: 'Apr', sales: 2780 },
            { name: 'May', sales: 1890 },
            { name: 'Jun', sales: 2390 },
            { name: 'Jul', sales: 3490 },
        ];

        res.json({
            totalProducts,
            totalOrders,
            inventoryValue,
            salesTrend
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const product = new Product({
        name: req.body.name,
        sku: req.body.sku,
        category: req.body.category,
        stock: req.body.stock,
        price: req.body.price,
        status: req.body.status,
        image: req.body.image // URL or base64
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. Orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
