const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const invoiceRoutes = require('./src/routes/invoiceRoutes');
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/productRoutes');
const accountRoutes = require('./src/routes/accountRoute');
const purchaseRoutes = require('./src/routes/purchaseRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const systemRoutes = require('./src/routes/systemRoutes');
const authenticate = require('./src/middleware/authenticate');

const pool = require('./src/config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Inventory Management System Backend is Active!');
});

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Inventory System Backend is running smoothly with MySQL!'
    });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', authenticate);
app.use('/api/products', productRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

// 1. Add Inventory Batch
app.post('/api/batches', async (req, res) => {
    const { product_id, batch_number, quantity, cost_price, expiry_date } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO inventory_batches (product_id, batch_number, quantity, cost_price, expiry_date) VALUES (?, ?, ?, ?, ?)',
            [product_id, batch_number, quantity, cost_price, expiry_date]
        );

        res.status(201).json({
            message: 'Batch added successfully',
            batchId: result.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Failed to add inventory batch'
        });
    }
});

// 2. Get Batches for a Product
app.get('/api/batches/:product_id', async (req, res) => {
    const { product_id } = req.params;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM inventory_batches WHERE product_id = ? AND quantity > 0 ORDER BY expiry_date ASC',
            [product_id]
        );

        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Failed to fetch batches'
        });
    }
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({
        status: 'error',
        message: 'Something went wrong on the server!'
    });
});

module.exports = app;
