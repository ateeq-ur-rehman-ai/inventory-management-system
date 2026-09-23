const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Get Transactions with Optional Date & Type Filters
router.get('/', async (req, res) => {
    let { startDate, endDate, type } = req.query;
    let query = "SELECT * FROM transactions WHERE 1=1";
    let params = [];

    if (startDate && endDate) {
        query += " AND date BETWEEN ? AND ?";
        params.push(startDate, endDate);
    }

    if (type && type !== 'ALL') {
        query += " AND type = ?";
        params.push(type);
    }

    query += " ORDER BY id DESC";

    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Add New Transaction (Expense / Income / Account entry)
router.post('/add', async (req, res) => {
    const { type, ref, desc, amount, date } = req.body;
    const numericAmount = Number(amount);
    const allowedTypes = ['Expense', 'Other Income'];
    if (!allowedTypes.includes(type) || !Number.isFinite(numericAmount) || numericAmount <= 0 || !date) {
        return res.status(400).json({ error: 'Enter a valid income or expense amount and date.' });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO transactions (type, ref, `desc`, amount, date) VALUES (?, ?, ?, ?, ?)",
            [type, ref || '', desc || '', numericAmount, date]
        );
        res.status(201).json({ message: 'Transaction added successfully', id: result.insertId });
    } catch (err) {
        console.error('Error adding transaction:', err);
        res.status(500).json({ error: 'Failed to add transaction' });
    }
});

// 3. Accounts Summary Stats Endpoint (For Dashboard / Summary Cards)
router.get('/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                SUM(CASE WHEN type IN ('Sales Income', 'Other Income') THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN type = 'Purchase Cost' THEN amount ELSE 0 END) as total_purchase_cost
            FROM transactions
        `);
        
        const summary = rows[0] || { total_income: 0, total_expense: 0, total_purchase_cost: 0 };
        const netBalance = (summary.total_income || 0) - (summary.total_expense || 0);

        res.json({
            totalIncome: summary.total_income || 0,
            totalExpense: summary.total_expense || 0,
            totalPurchaseCost: summary.total_purchase_cost || 0,
            netBalance: netBalance
        });
    } catch (err) {
        console.error('Error fetching summary:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
