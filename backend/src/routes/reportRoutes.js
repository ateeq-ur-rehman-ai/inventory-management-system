const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getProfitAndLoss,
  getBalanceSheet,
  getDailySales,
  getMonthlySales,
  getPurchaseReport,
  getSalesPurchaseSummary,
  getProductSales,
  getInventoryReport,
  getLowStockReport,
  getFinancialReport
} = require('../controllers/reportController');

router.get('/dashboard', getDashboard);
router.get('/profit-loss', getProfitAndLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/daily-sales', getDailySales);
router.get('/monthly-sales', getMonthlySales);
router.get('/purchases', getPurchaseReport);
router.get('/sales-purchase-summary', getSalesPurchaseSummary);
router.get('/product-sales', getProductSales);
router.get('/inventory', getInventoryReport);
router.get('/low-stock', getLowStockReport);
router.get('/financial', getFinancialReport);

module.exports = router;
