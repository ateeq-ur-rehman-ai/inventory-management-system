-- Retain products referenced by invoices while hiding them from active inventory.
ALTER TABLE products
  ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active';
