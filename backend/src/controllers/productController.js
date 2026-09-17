const pool = '../config/database'; // Wait, path check kar lena: '../config/database' ya theek ho
// Behtar hai absolute ya relative path theek se dein:
const db = require('../config/database');

// 1. Get All Products
exports.getAllProducts = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
        res.status(200).json({ status: 'success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 2. Add New Product (with 10% retail markup logic)
exports.addProduct = async (req, res) => {
    try {
        const { name, sku, category, cost_price } = req.body;
        
        // 10% retail markup calculation rule
        const selling_price = Number(cost_price) * 1.10;

        const [result] = await db.query(
            'INSERT INTO products (name, sku, category, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
            [name, sku, category, cost_price, selling_price]
        );

        res.status(201).json({
            status: 'success',
            message: 'Product added successfully with 10% markup!',
            data: { id: result.insertId, name, sku, category, cost_price, selling_price }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};