const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all products (Category aur prices ko sahi keys ke sath map kar diya hai)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id, 
        name, 
        product_code AS sku, 
        COALESCE(category, 'General') AS category, 
        purchase_price AS cost_price, 
        retail_price AS selling_price,
        stock_quantity 
      FROM products
    `);
    res.json(rows);
  } catch (err) {
    console.error('ASAL ERROR YAHAN HAI:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add product (Frontend aur backend ki sari fields ko handle karega)
router.post(['/', '/add'], async (req, res) => {
  let { 
    product_code, 
    name, 
    category,
    purchase_price, cost_price, 
    wholesale_price, 
    retail_price, selling_price,
    stock_quantity, 
    low_stock_threshold 
  } = req.body;

  // Frontend ya backend dono taraf ki keys ko support karne ke liye logic
  const finalCost = purchase_price || cost_price || 0;
  const finalRetail = retail_price || selling_price || 0;
  const finalCategory = category || 'General';
  const finalCode = product_code || `PRD-${Date.now()}`;

  try {
    await db.query(
      `INSERT INTO products (product_code, name, category, purchase_price, wholesale_price, retail_price, stock_quantity, low_stock_threshold) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCode, 
        name || 'Unnamed Product', 
        finalCategory, 
        finalCost, 
        wholesale_price || finalCost, 
        finalRetail, 
        stock_quantity || 0, 
        low_stock_threshold || 5
      ]
    );
    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('ASAL ERROR YAHAN HAI:', err);
    res.status(500).json({ error: err.message });
  }
});

// Edit product
// Update product route
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  let { product_code, sku, name, category, purchase_price, cost_price, retail_price, selling_price } = req.body;

  const finalSku = product_code || sku || `PRD-${Date.now()}`;
  const finalCost = purchase_price || cost_price || 0;
  const finalRetail = retail_price || selling_price || 0;
  const finalCategory = category || 'General';

  try {
    await db.query(
      `UPDATE products SET product_code = ?, name = ?, category = ?, purchase_price = ?, retail_price = ? WHERE id = ?`,
      [finalSku, name, finalCategory, finalCost, finalRetail, id]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product
// Delete product route
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock quantity
router.put('/adjust-stock/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity_change, type } = req.body; // type: 'add' or 'subtract'
  try {
    const [rows] = await db.query('SELECT stock_quantity FROM products WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    let currentStock = rows[0].stock_quantity;
    let newStock = type === 'add' ? currentStock + Number(quantity_change) : currentStock - Number(quantity_change);
    
    if (newStock < 0) newStock = 0;

    await db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, id]);
    res.json({ message: 'Stock adjusted successfully', new_stock: newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get low-stock products
router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE stock_quantity <= low_stock_threshold');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;