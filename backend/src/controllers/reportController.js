const db = require('../config/database');

const amount = (value) => Number(value || 0);

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const isMonth = (value) => /^\d{4}-\d{2}$/.test(value || '');

async function getProfitAndLossSummary() {
  const [rows] = await db.query(`
    SELECT
      COALESCE((SELECT SUM(net_amount) FROM invoices), 0) AS total_sales,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'Purchase Cost'), 0) AS cogs,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'Expense'), 0) AS expenses
  `);

  const summary = rows[0];
  const totalSales = amount(summary.total_sales);
  const cogs = amount(summary.cogs);
  const expenses = amount(summary.expenses);
  const grossProfit = totalSales - cogs;

  return {
    totalSales,
    cogs,
    grossProfit,
    expenses,
    netProfit: grossProfit - expenses
  };
}

exports.getProfitAndLoss = async (req, res) => {
  try {
    res.json(await getProfitAndLossSummary());
  } catch (error) {
    console.error('Error fetching profit and loss:', error);
    res.status(500).json({ error: 'Failed to fetch profit and loss data' });
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM transactions WHERE type IN ('Sales Income', 'Other Income')), 0) AS cash_received,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'Expense'), 0) AS expenses_paid,
        COALESCE((SELECT SUM(total_amount) FROM purchases), 0) AS purchases_paid,
        COALESCE((SELECT SUM(stock_quantity * purchase_price) FROM products), 0) AS inventory_value
    `);

    const summary = rows[0];
    const cash = amount(summary.cash_received) - amount(summary.expenses_paid) - amount(summary.purchases_paid);
    const inventory = amount(summary.inventory_value);
    const assets = cash + inventory;
    const liabilities = 0;

    res.json({
      assets: {
        cash,
        inventory,
        total: assets
      },
      liabilities: {
        total: liabilities
      },
      equity: assets - liabilities,
      equation: {
        assets,
        liabilitiesAndEquity: liabilities + (assets - liabilities)
      }
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet data' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const [todayRows, lowStockRows, salesOverviewRows, purchaseOverviewRows, profitAndLoss] = await Promise.all([
      db.query(`
        SELECT
          COALESCE((SELECT SUM(net_amount) FROM invoices WHERE DATE(created_at) = CURDATE()), 0) AS today_sales,
          COALESCE((SELECT SUM(total_amount) FROM purchases WHERE purchase_date = CURDATE()), 0) AS today_purchases,
          COALESCE((SELECT SUM(stock_quantity) FROM products WHERE status = 'active'), 0) AS current_stock
      `),
      db.query(`
        SELECT id, product_code, name, stock_quantity, low_stock_threshold
        FROM products
        WHERE status = 'active' AND stock_quantity <= low_stock_threshold
        ORDER BY stock_quantity ASC, name ASC
      `),
      db.query(`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS invoice_count,
          COALESCE(SUM(net_amount), 0) AS total
        FROM invoices
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.query(`
        SELECT
          purchase_date AS date,
          COUNT(*) AS purchase_count,
          COALESCE(SUM(total_amount), 0) AS total
        FROM purchases
        WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY purchase_date
        ORDER BY date ASC
      `),
      getProfitAndLossSummary()
    ]);

    const today = todayRows[0][0];
    res.json({
      todaySales: amount(today.today_sales),
      todayPurchases: amount(today.today_purchases),
      currentStock: amount(today.current_stock),
      lowStockProducts: lowStockRows[0],
      salesOverview: salesOverviewRows[0].map((row) => ({
        ...row,
        invoice_count: amount(row.invoice_count),
        total: amount(row.total)
      })),
      purchaseOverview: purchaseOverviewRows[0].map((row) => ({
        ...row,
        purchase_count: amount(row.purchase_count),
        total: amount(row.total)
      })),
      profitOverview: profitAndLoss
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

exports.getDailySales = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) return res.status(400).json({ error: 'Use date format YYYY-MM-DD.' });

  try {
    const [rows] = await db.query(`
      SELECT i.id, i.invoice_number, i.customer_name, i.sale_type, i.net_amount, i.created_at,
        COALESCE(SUM(ii.quantity), 0) AS items_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE DATE(i.created_at) = ?
      GROUP BY i.id, i.invoice_number, i.customer_name, i.sale_type, i.net_amount, i.created_at
      ORDER BY i.id DESC
    `, [date]);
    res.json({ date, totalSales: rows.reduce((total, row) => total + amount(row.net_amount), 0), invoices: rows });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ error: 'Failed to fetch daily sales report' });
  }
};

exports.getMonthlySales = async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!isMonth(month)) return res.status(400).json({ error: 'Use month format YYYY-MM.' });

  try {
    const [rows] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS invoice_count, COALESCE(SUM(net_amount), 0) AS total_sales
      FROM invoices
      WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [month]);
    res.json({ month, totalSales: rows.reduce((total, row) => total + amount(row.total_sales), 0), dailySales: rows });
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ error: 'Failed to fetch monthly sales report' });
  }
};

exports.getPurchaseReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  if ((startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) {
    return res.status(400).json({ error: 'Use date format YYYY-MM-DD.' });
  }

  try {
    let sql = `SELECT id, purchase_number, supplier_name, total_amount, purchase_date FROM purchases WHERE 1 = 1`;
    const params = [];
    if (startDate) { sql += ' AND purchase_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND purchase_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY purchase_date DESC, id DESC';
    const [purchases] = await db.query(sql, params);
    res.json({ totalPurchases: purchases.reduce((total, row) => total + amount(row.total_amount), 0), purchases });
  } catch (error) {
    console.error('Error fetching purchase report:', error);
    res.status(500).json({ error: 'Failed to fetch purchase report' });
  }
};

exports.getSalesPurchaseSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COALESCE((SELECT SUM(net_amount) FROM invoices), 0) AS total_sales,
        COALESCE((SELECT SUM(total_amount) FROM purchases), 0) AS total_purchases
    `);
    const totalSales = amount(rows[0].total_sales);
    const totalPurchases = amount(rows[0].total_purchases);
    res.json({ totalSales, totalPurchases, difference: totalSales - totalPurchases });
  } catch (error) {
    console.error('Error fetching sales and purchase summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales and purchase summary' });
  }
};

exports.getProductSales = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.id, p.product_code, p.name,
        COALESCE(SUM(ii.quantity), 0) AS quantity_sold,
        COALESCE(SUM(ii.total_price), 0) AS sales_total
      FROM products p
      JOIN invoice_items ii ON ii.product_id = p.id
      GROUP BY p.id, p.product_code, p.name
      ORDER BY sales_total DESC, quantity_sold DESC, p.name ASC
    `);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching product sales:', error);
    res.status(500).json({ error: 'Failed to fetch product sales report' });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT id, product_code, name, category, purchase_price, wholesale_price, retail_price,
        stock_quantity, low_stock_threshold, stock_quantity * purchase_price AS inventory_value
      FROM products
      WHERE status = 'active'
      ORDER BY name ASC
    `);
    res.json({ currentStock: products.reduce((total, product) => total + amount(product.stock_quantity), 0), products });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ error: 'Failed to fetch inventory report' });
  }
};

exports.getLowStockReport = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT id, product_code, name, category, stock_quantity, low_stock_threshold
      FROM products
      WHERE status = 'active' AND stock_quantity <= low_stock_threshold
      ORDER BY stock_quantity ASC, name ASC
    `);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching low-stock report:', error);
    res.status(500).json({ error: 'Failed to fetch low-stock report' });
  }
};

exports.getFinancialReport = async (req, res) => {
  try {
    const [accountRows, profitLoss] = await Promise.all([
      db.query(`SELECT
        COALESCE(SUM(CASE WHEN type IN ('Sales Income', 'Other Income') THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses
        FROM transactions`),
      getProfitAndLossSummary()
    ]);
    const summary = accountRows[0][0];
    res.json({
      totalIncome: amount(summary.total_income),
      totalExpenses: amount(summary.total_expenses),
      profitLoss
    });
  } catch (error) {
    console.error('Error fetching financial report:', error);
    res.status(500).json({ error: 'Failed to fetch financial report' });
  }
};
