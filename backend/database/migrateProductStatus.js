const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../src/config/database');

async function migrate() {
  const [columns] = await db.query("SHOW COLUMNS FROM products LIKE 'status'");

  if (columns.length === 0) {
    await db.query(
      "ALTER TABLE products ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"
    );
    console.log('Added products.status.');
  } else {
    console.log('products.status already exists.');
  }
}

migrate()
  .catch((error) => {
    console.error('Product status migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
