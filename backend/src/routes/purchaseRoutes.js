const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        purchase_number,
        supplier_name,
        total_amount,
        purchase_date,
        created_at
      FROM purchases
      ORDER BY purchase_date DESC, id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Add purchase
router.post('/', async (req, res) => {
  const {
    purchase_number,
    supplier_name,
    total_amount,
    purchase_date
  } = req.body;

  try {
    const [result] = await pool.query(
      `
      INSERT INTO purchases
      (
        purchase_number,
        supplier_name,
        total_amount,
        purchase_date
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        purchase_number || `PUR-${Date.now()}`,
        supplier_name || '',
        Number(total_amount || 0),
      purchase_date || new Date().toISOString().slice(0, 10)
      ]
    );

    res.status(201).json({
      message: 'Purchase added successfully',
      purchase: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error adding purchase:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Get single purchase
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM purchases WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase not found'
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching purchase:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Delete purchase
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM purchases WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Purchase not found'
      });
    }

    res.json({
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
