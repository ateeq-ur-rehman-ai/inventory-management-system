const db = require('../config/database');

const createInvoice = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            customerName,
            saleType,
            totalAmount,
            discount,
            netAmount,
            items
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: 'Invoice items are required'
            });
        }

        await connection.beginTransaction();

        const [numberRows] = await connection.query(`
            SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number, 5) AS UNSIGNED)), 0) AS last_number
            FROM invoices
            WHERE invoice_number REGEXP '^INV-[0-9]+$'
        `);
        const invoiceNumber = `INV-${String(Number(numberRows[0].last_number) + 1).padStart(6, '0')}`;

        for (const item of items) {
            if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
                throw new Error('Each invoice item must have a positive whole-number quantity.');
            }
            const [products] = await connection.query(
                'SELECT id, name, stock_quantity, purchase_price FROM products WHERE id = ? FOR UPDATE',
                [item.productId]
            );

            if (products.length === 0) {
                throw new Error(`Product not found: ${item.productId}`);
            }

            const product = products[0];

            if (product.stock_quantity < Number(item.quantity)) {
                throw new Error(
                    `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`
                );
            }
        }

        const [invoiceResult] = await connection.query(
            `INSERT INTO invoices
            (invoice_number, customer_name, sale_type, total_amount, discount, net_amount)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                invoiceNumber,
                customerName || 'Walk-in Customer',
                saleType || 'RETAIL',
                Number(totalAmount) || 0,
                Number(discount) || 0,
                Number(netAmount) || 0
            ]
        );

        const invoiceId = invoiceResult.insertId;

        let totalCOGS = 0;

        for (const item of items) {
            const [products] = await connection.query(
                'SELECT id, purchase_price FROM products WHERE id = ? FOR UPDATE',
                [item.productId]
            );

            const product = products[0];

            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            const totalPrice = Number(item.totalPrice);

            await connection.query(
                `INSERT INTO invoice_items
                (invoice_id, product_id, batch_id, quantity, unit_price, total_price)
                VALUES (?, ?, NULL, ?, ?, ?)`,
                [
                    invoiceId,
                    item.productId,
                    quantity,
                    unitPrice,
                    totalPrice
                ]
            );

            await connection.query(
                `UPDATE products
                 SET stock_quantity = stock_quantity - ?
                 WHERE id = ?`,
                [quantity, item.productId]
            );

            totalCOGS += Number(product.purchase_price) * quantity;
        }

        await connection.query(
            `INSERT INTO transactions
            (type, ref, \`desc\`, amount, date)
            VALUES (?, ?, ?, ?, CURDATE())`,
            [
                'Sales Income',
                invoiceNumber,
                `Sale against invoice ${invoiceNumber}`,
                Number(netAmount) || 0
            ]
        );

        if (totalCOGS > 0) {
            await connection.query(
                `INSERT INTO transactions
                (type, ref, \`desc\`, amount, date)
                VALUES (?, ?, ?, ?, CURDATE())`,
                [
                    'Purchase Cost',
                    invoiceNumber,
                    `Cost of goods sold for invoice ${invoiceNumber}`,
                    totalCOGS
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Invoice created successfully',
            invoiceId,
            invoiceNumber,
            totalCOGS
        });

    } catch (error) {
        await connection.rollback();

        console.error('Invoice creation error:', error);

        res.status(500).json({
            error: error.message || 'Failed to create invoice'
        });
    } finally {
        connection.release();
    }
};


const getInvoices = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                i.id,
                i.invoice_number,
                i.customer_name,
                i.sale_type,
                i.total_amount,
                i.discount,
                i.net_amount,
                i.created_at,
                COALESCE(SUM(ii.quantity), 0) AS items_count
            FROM invoices i
            LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
            GROUP BY
                i.id,
                i.invoice_number,
                i.customer_name,
                i.sale_type,
                i.total_amount,
                i.discount,
                i.net_amount,
                i.created_at
            ORDER BY i.id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.error('Error fetching invoices:', error);

        res.status(500).json({
            error: 'Failed to fetch invoices'
        });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const [invoiceRows] = await db.query(
            `SELECT
            id,
            invoice_number,
            customer_name,
            sale_type,
            total_amount,
            discount,
            net_amount,
            created_at
            FROM invoices
            WHERE id = ?`,
            [id]
        );

        if (invoiceRows.length === 0) {
            return res.status(404).json({
                error: 'Invoice not found'
            });
        }

        const [itemRows] = await db.query(
            `SELECT
                ii.id,
                ii.product_id,
                p.name AS product_name,
                p.product_code,
                ii.quantity,
                ii.unit_price,
                ii.total_price
             FROM invoice_items ii
             JOIN products p ON p.id = ii.product_id
             WHERE ii.invoice_id = ?
             ORDER BY ii.id ASC`,
            [id]
        );

        res.json({
            invoice: invoiceRows[0],
            items: itemRows
        });

    } catch (error) {
        console.error('Error fetching invoice:', error);

        res.status(500).json({
            error: 'Failed to fetch invoice'
        });
    }
};


module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById
};
