const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all products
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        product_code AS sku,
        COALESCE(category, 'General') AS category,
        purchase_price,
        purchase_price AS cost_price,
        wholesale_price,
        retail_price,
        retail_price AS selling_price,
        stock_quantity,
        low_stock_threshold
      FROM products
      WHERE status = 'active'
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add product
router.post(['/', '/add'], async (req, res) => {
  const {
    product_code,
    name,
    category,
    purchase_price,
    cost_price,
    wholesale_price,
    retail_price,
    selling_price,
    stock_quantity,
    low_stock_threshold
  } = req.body;

  const finalCode = product_code || `PRD-${Date.now()}`;
  const finalName = name || 'Unnamed Product';
  const finalCategory = category || 'General';
  const finalCost = Number(purchase_price ?? cost_price ?? 0);
  const finalWholesale = Number(wholesale_price ?? finalCost);
  const finalRetail = Number(retail_price ?? selling_price ?? 0);
  const finalStock = Number(stock_quantity ?? 0);
  const finalThreshold = Number(low_stock_threshold ?? 5);

  if (!finalCode.trim() || !finalName.trim() || !Number.isFinite(finalCost) || !Number.isFinite(finalWholesale) || !Number.isFinite(finalRetail) || !Number.isInteger(finalStock) || !Number.isInteger(finalThreshold) || finalCost < 0 || finalWholesale < 0 || finalRetail < 0 || finalStock < 0 || finalThreshold < 0) {
    return res.status(400).json({ error: 'Enter a product code, name, valid non-negative prices, whole-number stock, and threshold.' });
  }

  try {
    const [result] = await db.query(
      `
      INSERT INTO products
      (
        product_code,
        name,
        category,
        purchase_price,
        wholesale_price,
        retail_price,
        stock_quantity,
        low_stock_threshold
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalCode,
        finalName,
        finalCategory,
        finalCost,
        finalWholesale,
        finalRetail,
        finalStock,
        finalThreshold
      ]
    );

    res.status(201).json({
      message: 'Product added successfully',
      productId: result.insertId
    });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;

  const {
    product_code,
    sku,
    name,
    category,
    purchase_price,
    cost_price,
    wholesale_price,
    retail_price,
    selling_price,
    low_stock_threshold
  } = req.body;

  const finalCode = product_code || sku || `PRD-${Date.now()}`;
  const finalCost = Number(purchase_price ?? cost_price ?? 0);
  const finalWholesale = Number(wholesale_price ?? finalCost);
  const finalRetail = Number(retail_price ?? selling_price ?? 0);
  const finalCategory = category || 'General';
  const finalThreshold = Number(low_stock_threshold ?? 5);

  if (!finalCode.trim() || !name?.trim() || !Number.isFinite(finalCost) || !Number.isFinite(finalWholesale) || !Number.isFinite(finalRetail) || !Number.isInteger(finalThreshold) || finalCost < 0 || finalWholesale < 0 || finalRetail < 0 || finalThreshold < 0) {
    return res.status(400).json({ error: 'Enter a product code, name, valid non-negative prices, and threshold.' });
  }

  try {
    const [result] = await db.query(
      `
      UPDATE products
      SET
        product_code = ?,
        name = ?,
        category = ?,
        purchase_price = ?,
        wholesale_price = ?,
        retail_price = ?,
        low_stock_threshold = ?
      WHERE id = ?
      `,
      [
        finalCode,
        name,
        finalCategory,
        finalCost,
        finalWholesale,
        finalRetail,
        finalThreshold,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    res.json({
      message: 'Product updated successfully'
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE products SET status = 'inactive' WHERE id = ? AND status = 'active'",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Adjust stock quantity
router.put('/adjust-stock/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity_change, type } = req.body;
  const change = Number(quantity_change);

  if (!['add', 'subtract'].includes(type) || !Number.isInteger(change) || change <= 0) {
    return res.status(400).json({ error: 'Use a positive whole-number quantity and type add or subtract.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const currentStock = Number(rows[0].stock_quantity);
    let newStock;

    if (type === 'add') {
      newStock = currentStock + change;
    } else {
      newStock = currentStock - change;
    }

    if (newStock < 0) {
      newStock = 0;
    }

    await db.query(
      'UPDATE products SET stock_quantity = ? WHERE id = ?',
      [newStock, id]
    );

    res.json({
      message: 'Stock adjusted successfully',
      new_stock: newStock
    });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get low-stock products
router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM products
      WHERE status = 'active'
        AND stock_quantity <= low_stock_threshold
      ORDER BY stock_quantity ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching low-stock products:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
