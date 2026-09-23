  import { useState, useEffect, useRef } from 'react';
  import API from './api';
  import './App.css';
  import { useReactToPrint } from 'react-to-print';
  import { Eye, EyeOff } from 'lucide-react';

  export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('authToken')));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');

    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [products, setProducts] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [cart, setCart] = useState([]);
    const [saleType, setSaleType] = useState('retail'); 
    const [discount, setDiscount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const [transactions, setTransactions] = useState([]);
    const [accountSummary, setAccountSummary] = useState({ totalIncome: 0, totalExpense: 0, totalPurchaseCost: 0, netBalance: 0 });
    const [dashboard, setDashboard] = useState({ todaySales: 0, todayPurchases: 0, currentStock: 0, lowStockProducts: [], salesOverview: [], purchaseOverview: [], profitOverview: {} });
    const [profitLoss, setProfitLoss] = useState({ totalSales: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 });
    const [balanceSheet, setBalanceSheet] = useState({ assets: { cash: 0, inventory: 0, total: 0 }, liabilities: { total: 0 }, equity: 0, equation: { assets: 0, liabilitiesAndEquity: 0 } });
    const [reportError, setReportError] = useState('');
    const [reports, setReports] = useState({ dailySales: { invoices: [], totalSales: 0 }, monthlySales: { dailySales: [], totalSales: 0 }, purchases: { purchases: [], totalPurchases: 0 }, summary: {}, productSales: { products: [] }, inventory: { products: [], currentStock: 0 }, lowStock: { products: [] }, financial: { profitLoss: {} } });
    const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reportsLoading, setReportsLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [backupMessage, setBackupMessage] = useState('');
    const [expenseCategories] = useState(['Utilities', 'Rent', 'Transport', 'Salaries', 'Miscellaneous']);
    const [newExpense, setNewExpense] = useState({ title: '', category: 'Utilities', amount: '', date: new Date().toISOString().split('T')[0] });
    const [newIncome, setNewIncome] = useState({ title: '', amount: '', date: new Date().toISOString().split('T')[0] });

    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    const [printData, setPrintData] = useState(null);
    const receiptRef = useRef();

    const handlePrintTrigger = useReactToPrint({
      contentRef: receiptRef,
      documentTitle: printData ? `Invoice-${printData.invoiceNo}` : 'Invoice',
    });

    const handlePrintInvoice = async (sale) => {
      try {
        let receipt = sale;
        if (sale.id) {
          const response = await API.get(`/invoices/${sale.id}`);
          const { invoice, items } = response.data;
          receipt = {
            invoiceNo: invoice.invoice_number,
            date: new Date(invoice.created_at).toLocaleString(),
            type: invoice.sale_type,
            subtotal: Number(invoice.total_amount),
            discount: Number(invoice.discount),
            grandTotal: Number(invoice.net_amount),
            items: items.map((item) => ({ name: item.product_name, qty: Number(item.quantity), price: Number(item.unit_price) }))
          };
        }
        setPrintData(receipt);
        setTimeout(() => handlePrintTrigger(), 200);
      } catch (err) {
        console.error('Error loading invoice for printing:', err);
        alert('Unable to load invoice details for printing.');
      }
    };

    const [newProduct, setNewProduct] = useState({ 
      name: '', 
      product_code: '', 
      category: 'General', 
      purchase_price: '', 
      wholesale_price: '', 
      retail_price: '', 
      stock_quantity: '', 
      low_stock_threshold: 5 
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
      if (isLoggedIn) {
        fetchProducts();
        fetchInvoices();
        fetchTransactions();
        fetchAccountSummary();
        fetchReports();
        fetchDaySixReports();
      }
    }, [isLoggedIn]);

    async function fetchProducts() {
      try {
        const response = await API.get('/products');
        setProducts(response.data);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    }

    async function fetchInvoices() {
      try {
        const response = await API.get('/invoices');
        const formattedInvoices = response.data.map(invoice => ({
          id: invoice.id,
          invoiceNo: invoice.invoice_number,
          date: new Date(invoice.created_at).toLocaleString(),
          type: invoice.sale_type,
          subtotal: Number(invoice.total_amount || 0),
          discount: Number(invoice.discount || 0),
          itemsCount: Number(invoice.items_count || 0),
          grandTotal: Number(invoice.net_amount || 0),
          items: invoice.items || []
        }));
        setSalesHistory(formattedInvoices);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      }
    }

    async function fetchTransactions() {
      try {
        let url = '/accounts?';
        if (filterStartDate && filterEndDate) {
          url += `startDate=${filterStartDate}&endDate=${filterEndDate}&`;
        }
        if (filterType && filterType !== 'ALL') {
          url += `type=${filterType}`;
        }
        const response = await API.get(url);
        setTransactions(response.data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }
    }

    async function fetchAccountSummary() {
      try {
        const response = await API.get('/accounts/summary');
        setAccountSummary(response.data);
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    }

    async function fetchReports() {
      try {
        setReportError('');
        const [dashboardResponse, profitLossResponse, balanceSheetResponse] = await Promise.all([
          API.get('/reports/dashboard'),
          API.get('/reports/profit-loss'),
          API.get('/reports/balance-sheet')
        ]);
        setDashboard(dashboardResponse.data);
        setProfitLoss(profitLossResponse.data);
        setBalanceSheet(balanceSheetResponse.data);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setReportError('Financial reports could not be loaded. Please check the database connection.');
      }
    }

    async function fetchDaySixReports() {
      try {
        setReportsLoading(true);
        setReportError('');
        const [dailySales, monthlySales, purchases, summary, productSales, inventory, lowStock, financial, backupList] = await Promise.all([
          API.get(`/reports/daily-sales?date=${reportDate}`),
          API.get(`/reports/monthly-sales?month=${reportMonth}`),
          API.get('/reports/purchases'),
          API.get('/reports/sales-purchase-summary'),
          API.get('/reports/product-sales'),
          API.get('/reports/inventory'),
          API.get('/reports/low-stock'),
          API.get('/reports/financial'),
          API.get('/system/backups')
        ]);
        setReports({ dailySales: dailySales.data, monthlySales: monthlySales.data, purchases: purchases.data, summary: summary.data, productSales: productSales.data, inventory: inventory.data, lowStock: lowStock.data, financial: financial.data });
        setBackups(backupList.data.backups || []);
      } catch (err) {
        console.error('Error fetching Day 6 reports:', err);
        setReportError('Reports could not be loaded. Please check the database connection.');
      } finally {
        setReportsLoading(false);
      }
    }

    const createBackup = async () => {
      try {
        setBackupMessage('Creating backup...');
        const response = await API.post('/system/backups');
        setBackupMessage(response.data.message);
        fetchDaySixReports();
      } catch (err) {
        setBackupMessage(err.response?.data?.error || 'Failed to create backup.');
      }
    };

    const restoreBackup = async (name) => {
      if (!window.confirm(`Restore ${name}? This replaces the current database data and cannot be undone.`)) return;
      try {
        setBackupMessage('Restoring backup...');
        const response = await API.post('/system/restore', { name });
        setBackupMessage(response.data.message);
        fetchProducts(); fetchInvoices(); fetchTransactions(); fetchAccountSummary(); fetchReports(); fetchDaySixReports();
      } catch (err) {
        setBackupMessage(err.response?.data?.error || 'Failed to restore backup.');
      }
    };

    const exportCsv = (fileName, rows) => {
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${fileName}.csv`; link.click(); URL.revokeObjectURL(url);
    };

    const handleLogin = async (e) => {
      e.preventDefault();
      try {
        setLoginError('');
        const response = await API.post('/auth/login', { username, password });
        localStorage.setItem('authToken', response.data.token);
        setIsLoggedIn(true);
      } catch (err) {
        setLoginError(err.response?.data?.error || 'Unable to log in.');
      }
    };

    const handleSaveProduct = async (e) => {
      e.preventDefault();
      try {
        if (editingId) {
          await API.put(`/products/update/${editingId}`, newProduct);
          alert('Product updated successfully!');
          setEditingId(null);
        } else {
          await API.post('/products/add', newProduct);
          alert('Product added successfully!');
        }
        
        setNewProduct({ 
          name: '', 
          product_code: '', 
          category: 'General', 
          purchase_price: '', 
          wholesale_price: '', 
          retail_price: '', 
          stock_quantity: '', 
          low_stock_threshold: 5 
        });
        fetchProducts();
      } catch (err) {
        console.error('Error saving product:', err);
        alert('Failed to save product.');
      }
    };

    const handleDeleteProduct = async (id) => {
      if (window.confirm('Are you sure you want to delete this product?')) {
        try {
          await API.delete(`/products/delete/${id}`);
          fetchProducts();
          alert('Product deleted successfully!');
        } catch (err) {
          console.error('Error deleting product:', err);
          alert('Failed to delete product.');
        }
      }
    };

    const handleEditClick = (product) => {
      setEditingId(product.id);
      setNewProduct({
        name: product.name,
        product_code: product.sku || product.product_code,
        category: product.category || 'General',
        purchase_price: product.purchase_price || '',
        wholesale_price: product.wholesale_price || '',
        retail_price: product.retail_price || '',
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold || 5
      });
    };

    const addToCart = (product) => {
      const stock = product.stock_quantity;
      if (stock <= 0) {
        alert('This product is out of stock!');
        return;
      }
      const existingItem = cart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.qty >= stock) {
          alert('No more stock available!');
          return;
        }
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      } else {
        setCart([...cart, { ...product, qty: 1 }]);
      }
    };

    const updateCartQty = (id, qty) => {
      const product = products.find(p => p.id === id);
      if (qty > product.stock_quantity) {
        alert('Stock limit exceeded!');
        return;
      }
      if (qty <= 0) {
        setCart(cart.filter(item => item.id !== id));
      } else {
        setCart(cart.map(item => item.id === id ? { ...item, qty: Number(qty) } : item));
      }
    };

    const removeFromCart = (id) => {
      setCart(cart.filter(item => item.id !== id));
    };

    const subtotal = cart.reduce((acc, item) => {
      const itemPrice = saleType === 'wholesale' ? (item.wholesale_price || item.purchase_price) : (item.retail_price);
      return acc + (itemPrice * item.qty);
    }, 0);

    const grandTotal = Math.max(0, subtotal - Number(discount));

    const completeSale = async () => {
      if (cart.length === 0) {
        alert('Cart is empty!');
        return;
      }

      try {
        const currentDateStr = new Date().toLocaleString();

        const invoiceItems = cart.map(item => {
          const unitPrice = saleType === 'wholesale'
            ? Number(item.wholesale_price || item.purchase_price || 0)
            : Number(item.retail_price || 0);

          return {
            productId: item.id,
            quantity: Number(item.qty),
            unitPrice,
            totalPrice: unitPrice * Number(item.qty)
          };
        });

        const invoiceResponse = await API.post('/invoices', {
          customerName: 'Walk-in Customer',
          saleType: saleType.toUpperCase(),
          totalAmount: Number(subtotal),
          discount: Number(discount),
          netAmount: Number(grandTotal),
          items: invoiceItems
        });

        const newSale = {
          id: invoiceResponse.data.invoiceId,
          invoiceNo: invoiceResponse.data.invoiceNumber,
          date: currentDateStr,
          type: saleType.toUpperCase(),
          subtotal: Number(subtotal),
          discount: Number(discount),
          itemsCount: cart.reduce((total, item) => total + Number(item.qty), 0),
          grandTotal: Number(grandTotal),
          items: cart.map(item => ({ name: item.name, price: saleType === 'wholesale' ? Number(item.wholesale_price || item.purchase_price || 0) : Number(item.retail_price || 0), qty: Number(item.qty) }))
        };

        setCart([]);
        setDiscount(0);
        setSearchTerm('');

        await fetchProducts();
        await fetchInvoices();
        await fetchTransactions();
        await fetchAccountSummary();
        await fetchReports();

        alert('Sale completed successfully!');
        setActiveTab('history');
        handlePrintInvoice(newSale);
      } catch (err) {
        console.error('Error completing sale:', err);
        const message = err.response?.data?.error || 'Failed to complete sale.';
        alert(message);
      }
    };

    const handleAddExpense = async (e) => {
      e.preventDefault();
      if (!newExpense.title || !newExpense.amount) return;
      try {
        await API.post('/accounts/add', {
          type: 'Expense',
          ref: newExpense.category,
          desc: newExpense.title,
          amount: Number(newExpense.amount),
          date: newExpense.date
        });
        setNewExpense({ title: '', category: expenseCategories[0] || 'Utilities', amount: '', date: new Date().toISOString().split('T')[0] });
        alert('Expense recorded successfully!');
        fetchTransactions();
        fetchAccountSummary();
        fetchReports();
      } catch (err) {
        console.error('Error adding expense:', err);
        alert('Failed to record expense');
      }
    };

    const handleAddIncome = async (e) => {
      e.preventDefault();
      if (!newIncome.title || !newIncome.amount) return;
      try {
        await API.post('/accounts/add', {
          type: 'Other Income',
          ref: 'General Income',
          desc: newIncome.title,
          amount: Number(newIncome.amount),
          date: newIncome.date
        });
        setNewIncome({ title: '', amount: '', date: new Date().toISOString().split('T')[0] });
        alert('Income recorded successfully!');
        fetchTransactions();
        fetchAccountSummary();
        fetchReports();
      } catch (err) {
        console.error('Error adding income:', err);
        alert('Failed to record income');
      }
    };

    useEffect(() => {
      const styleTag = document.createElement('style');
      styleTag.innerHTML = `
        @media (max-width: 900px) {
          .main-layout { flex-direction: column !important; }
          .sidebar { 
            position: fixed !important; 
            left: -260px; 
            top: 0; 
            bottom: 0; 
            z-index: 1000; 
            transition: left 0.3s ease; 
          }
          .sidebar.open { left: 0 !important; }
          .mobile-header { display: flex !important; }
          .pos-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 901px) {
          .mobile-header { display: none !important; }
          .sidebar { left: 0 !important; position: relative !important; }
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * { 
            visibility: hidden !important; 
          }
          .printable-receipt, .printable-receipt * { 
            visibility: visible !important; 
          }
          .printable-receipt { 
            position: fixed !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: 80mm !important;
            margin: 0 auto !important; 
            padding: 10px !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
          }
        }
      `;
      document.head.appendChild(styleTag);
      return () => { document.head.removeChild(styleTag); };
    }, []);

    if (!isLoggedIn) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', fontFamily: 'Segoe UI, sans-serif', padding: '15px' }}>
          <form onSubmit={handleLogin} style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', width: '100%', maxWidth: '380px', color: '#fff' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#38bdf8' }}>New Style Bike Cover</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '25px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Password</label>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
              />
              <span 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '34px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Login
            </button>
            {loginError && <p style={{ margin: '14px 0 0', color: '#fca5a5', textAlign: 'center' }}>{loginError}</p>}
          </form>
        </div>
      );
    }

    return (
      <div className="main-layout" style={{ display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>
        
        {/* Printable Receipt Container (Properly Contained & Clean) */}
        <div style={{ display: 'none' }}>
          <div ref={receiptRef} className="printable-receipt" style={{ fontFamily: 'monospace', padding: '10px', color: '#000', background: '#fff', width: '80mm', boxSizing: 'border-box' }}>
            {printData && (
              <div>
                <h3 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', color: '#000' }}>New Style Bike Cover</h3>
                <p style={{ textAlign: 'center', fontSize: '11px', margin: '0 0 10px 0', color: '#000' }}>POS Receipt / Invoice</p>
                <div style={{ fontSize: '12px', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px', color: '#000' }}>
                  <div><strong>Invoice:</strong> {printData.invoiceNo}</div>
                  <div><strong>Date:</strong> {printData.date}</div>
                  <div><strong>Type:</strong> {printData.type}</div>
                </div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '8px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#fff' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '4px', color: '#000', backgroundColor: 'transparent' }}>ITEM</th>
                      <th style={{ textAlign: 'center', paddingBottom: '4px', color: '#000', backgroundColor: 'transparent' }}>QTY</th>
                      <th style={{ textAlign: 'right', paddingBottom: '4px', color: '#000', backgroundColor: 'transparent' }}>PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.items.map((it, idx) => (
                      <tr key={idx} style={{ backgroundColor: '#fff', borderBottom: 'none' }}>
                        <td style={{ textAlign: 'left', padding: '4px 0', width: '50%', color: '#000', backgroundColor: 'transparent' }}>{it.name}</td>
                        <td style={{ textAlign: 'center', padding: '4px 0', width: '20%', color: '#000', backgroundColor: 'transparent' }}>{it.qty}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0', width: '30%', color: '#000', backgroundColor: 'transparent' }}>{it.price * it.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', fontSize: '12px', color: '#000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Subtotal:</span>
                    <span>Rs. {printData.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Discount:</span>
                    <span>Rs. {printData.discount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '6px', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                    <span>Grand Total:</span>
                    <span>Rs. {printData.grandTotal}</span>
                  </div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '10px', marginTop: '15px', color: '#000' }}>Thank you for your business!</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Top Bar */}
        <div className="mobile-header" style={{ display: 'none', background: '#0f172a', color: '#fff', padding: '15px 20px', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'fixed', top: 0, zIndex: 999, boxSizing: 'border-box' }}>
          <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>New Style Bike Cover</h3>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {sidebarOpen ? 'Close Menu' : 'Menu ☰'}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: '260px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 0', height: '100vh', boxSizing: 'border-box' }}>
          <div>
            <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #1e293b' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '18px' }}>New Style Bike Cover</h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Inventory Management System</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '20px', padding: '0 10px' }}>
              <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'dashboard' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Dashboard</button>
              <button onClick={() => { setActiveTab('inventory'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'inventory' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Inventory Management</button>
              <button onClick={() => { setActiveTab('pos'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'pos' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Sales & Billing POS</button>
              <button onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'history' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Sales History & Invoices</button>
              <button onClick={() => { setActiveTab('accounts'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'accounts' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Accounts & Finance</button>
              <button onClick={() => { setActiveTab('profit-loss'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'profit-loss' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Profit & Loss</button>
              <button onClick={() => { setActiveTab('balance-sheet'); setSidebarOpen(false); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'balance-sheet' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Balance Sheet</button>
              <button onClick={() => { setActiveTab('reports'); setSidebarOpen(false); fetchDaySixReports(); }} style={{ textAlign: 'left', padding: '12px 15px', background: activeTab === 'reports' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Reports & Backup</button>
            </div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <button onClick={() => { localStorage.removeItem('authToken'); setIsLoggedIn(false); }} style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Logout Account</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px', marginTop: '0', boxSizing: 'border-box' }}>
          
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#1e293b' }}>Dashboard Overview</h2>
                  <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Live inventory and finance data from MySQL.</p>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>● DB Live</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Sales</p>
                  <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '28px' }}>Rs. {dashboard.todaySales}</h2>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Purchases</p>
                  <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '28px' }}>Rs. {dashboard.todayPurchases}</h2>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Stock</p>
                  <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '28px' }}>{dashboard.currentStock}</h2>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Low-Stock Products</p>
                  <h2 style={{ margin: '10px 0 0 0', color: '#991b1b', fontSize: '28px' }}>{dashboard.lowStockProducts.length}</h2>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Low Stock Alerts ⚠️</h3>
                {dashboard.lowStockProducts.length === 0 ? (
                  <p style={{ color: '#166534', background: '#dcfce7', padding: '10px', borderRadius: '6px', margin: 0 }}>All products have sufficient stock level!</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                      <thead>
                        <tr style={{ background: '#fee2e2', borderBottom: '2px solid #fecaca', color: '#991b1b' }}>
                          <th style={{ padding: '10px' }}>Product Name</th>
                          <th style={{ padding: '10px' }}>SKU</th>
                          <th style={{ padding: '10px' }}>Current Stock</th>
                          <th style={{ padding: '10px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.lowStockProducts.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px', fontWeight: '500', color: '#1e293b' }}>{p.name}</td>
                              <td style={{ padding: '10px', color: '#64748b' }}>{p.product_code}</td>
                              <td style={{ padding: '10px', fontWeight: 'bold', color: '#991b1b' }}>{p.stock_quantity} Left</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                  {Number(p.stock_quantity) === 0 ? 'Out of Stock' : 'Low Stock'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {reportError && <p style={{ color: '#991b1b', background: '#fee2e2', padding: '10px', borderRadius: '6px', marginTop: '20px' }}>{reportError}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Sales Overview</h3>
                  {dashboard.salesOverview.length === 0 ? <p style={{ color: '#64748b', margin: 0 }}>No sales in the last 7 days.</p> : dashboard.salesOverview.map((row) => <p key={row.date} style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', color: '#475569' }}><span>{String(row.date).slice(0, 10)} ({row.invoice_count})</span><strong>Rs. {row.total}</strong></p>)}
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Purchase Overview</h3>
                  {dashboard.purchaseOverview.length === 0 ? <p style={{ color: '#64748b', margin: 0 }}>No purchases in the last 7 days.</p> : dashboard.purchaseOverview.map((row) => <p key={row.date} style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', color: '#475569' }}><span>{String(row.date).slice(0, 10)} ({row.purchase_count})</span><strong>Rs. {row.total}</strong></p>)}
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Profit Overview</h3>
                  <p style={{ color: '#64748b', margin: '8px 0' }}>Sales: <strong style={{ color: '#1e293b' }}>Rs. {dashboard.profitOverview.totalSales || 0}</strong></p>
                  <p style={{ color: '#64748b', margin: '8px 0' }}>COGS: <strong style={{ color: '#1e293b' }}>Rs. {dashboard.profitOverview.cogs || 0}</strong></p>
                  <p style={{ color: '#64748b', margin: '8px 0' }}>Expenses: <strong style={{ color: '#1e293b' }}>Rs. {dashboard.profitOverview.expenses || 0}</strong></p>
                  <p style={{ color: '#64748b', margin: '8px 0' }}>Net Profit: <strong style={{ color: (dashboard.profitOverview.netProfit || 0) >= 0 ? '#166534' : '#991b1b' }}>Rs. {dashboard.profitOverview.netProfit || 0}</strong></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="text" placeholder="Product Code / SKU" value={newProduct.product_code} onChange={(e) => setNewProduct({...newProduct, product_code: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="number" inputMode="numeric" placeholder="Purchase Price" value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="number" inputMode="numeric" placeholder="Wholesale Price" value={newProduct.wholesale_price} onChange={(e) => setNewProduct({...newProduct, wholesale_price: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="number" inputMode="numeric" placeholder="Retail Price" value={newProduct.retail_price} onChange={(e) => setNewProduct({...newProduct, retail_price: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="number" inputMode="numeric" placeholder="Stock Quantity" value={newProduct.stock_quantity} onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {editingId ? 'Update Product' : 'Add Product'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={() => { setEditingId(null); setNewProduct({ name: '', product_code: '', category: 'General', purchase_price: '', wholesale_price: '', retail_price: '', stock_quantity: '', low_stock_threshold: 5 }); }} style={{ padding: '10px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Inventory Stock Management</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px' }}>Product Name</th>
                        <th style={{ padding: '12px' }}>SKU</th>
                        <th style={{ padding: '12px' }}>Purchase Price</th>
                        <th style={{ padding: '12px' }}>Wholesale Price</th>
                        <th style={{ padding: '12px' }}>Retail Price</th>
                        <th style={{ padding: '12px' }}>Stock Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: '500', color: '#1e293b' }}>{p.name}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{p.sku || p.product_code}</td>
                          <td style={{ padding: '12px' }}>Rs. {p.purchase_price}</td>
                          <td style={{ padding: '12px' }}>Rs. {p.wholesale_price}</td>
                          <td style={{ padding: '12px' }}>Rs. {p.retail_price}</td>
                          <td style={{ padding: '12px' }}>
                            {p.stock_quantity > 0 ? (
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{p.stock_quantity} In Stock</span>
                            ) : (
                              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Out of Stock</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handleEditClick(p)} style={{ marginRight: '8px', padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => handleDeleteProduct(p.id)} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="pos-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Select Products</h3>
                  <select value={saleType} onChange={(e) => setSaleType(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                    <option value="retail">Retail Sale</option>
                    <option value="wholesale">Wholesale Sale</option>
                  </select>
                </div>
                <input type="text" placeholder="Search product by name or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                  {products
                    .filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || ((p.sku || p.product_code || '').toLowerCase().includes(searchTerm.toLowerCase())))
                    .map(p => (
                      <div key={p.id} onClick={() => addToCart(p)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#1e293b' }}>{p.name}</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>Rs. {saleType === 'wholesale' ? (p.wholesale_price || p.purchase_price) : p.retail_price}</p>
                        <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: p.stock_quantity > 0 ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
                          {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Current Cart ({cart.reduce((acc, item) => acc + item.qty, 0)})</h3>
                  {cart.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '30px 0' }}>Cart is empty. Click products to add.</p>
                  ) : (
                    <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '15px' }}>
                      {cart.map(item => {
                        const itemPrice = saleType === 'wholesale' ? (item.wholesale_price || item.purchase_price) : (item.retail_price);
                        return (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>{item.name}</h4>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Rs. {itemPrice} x {item.qty} = Rs. {itemPrice * item.qty}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <input type="number" inputMode="numeric" value={item.qty} onChange={(e) => updateCartQty(item.id, e.target.value)} style={{ width: '45px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                              <button onClick={() => removeFromCart(item.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b' }}>
                      <span>Subtotal:</span>
                      <span>Rs. {subtotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: '#64748b' }}>
                      <span>Discount:</span>
                      <input type="number" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', color: '#1e293b' }}>
                      <span>Grand Total:</span>
                      <span>Rs. {grandTotal}</span>
                    </div>
                  </div>
                  <button onClick={completeSale} style={{ width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                    Complete Sale & Print
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Sales History & Invoices</h3>
              {salesHistory.length === 0 ? (
                <p style={{ color: '#64748b' }}>No sales recorded in this session yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px' }}>Invoice No</th>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Type</th>
                        <th style={{ padding: '12px' }}>Items Count</th>
                        <th style={{ padding: '12px' }}>Grand Total</th>
                        <th style={{ padding: '12px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesHistory.map((sale, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#3b82f6' }}>{sale.invoiceNo}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{sale.date}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: sale.type === 'RETAIL' ? '#dcfce7' : '#fef3c7', color: sale.type === 'RETAIL' ? '#166534' : '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                              {sale.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{sale.itemsCount}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>Rs. {sale.grandTotal}</td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handlePrintInvoice(sale)} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print Receipt</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '15px', marginBottom: '20px' }}>
                <div><h2 style={{ margin: 0, color: '#1e293b' }}>Reports & Backup</h2><p style={{ color: '#64748b', margin: '6px 0 0' }}>All figures are loaded from the MySQL database.</p></div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} /><input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} /><button onClick={fetchDaySixReports} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Refresh Reports</button></div>
              </div>
              {reportsLoading && <p style={{ color: '#475569' }}>Loading reports...</p>}
              {reportError && <p style={{ color: '#991b1b', background: '#fee2e2', padding: '10px', borderRadius: '6px' }}>{reportError}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                {[['Daily Sales', reports.dailySales.totalSales], ['Monthly Sales', reports.monthlySales.totalSales], ['Total Purchases', reports.purchases.totalPurchases], ['Current Stock', reports.inventory.currentStock], ['Sales - Purchases', reports.summary.difference || 0]].map(([label, value]) => <div key={label} style={{ background: '#fff', padding: '18px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)' }}><p style={{ margin: 0, color: '#64748b' }}>{label}</p><h3 style={{ margin: '8px 0 0', color: '#1e293b' }}>{label === 'Current Stock' ? value : `Rs. ${value}`}</h3></div>)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)' }}><h3 style={{ marginTop: 0 }}>Daily Sales ({reportDate})</h3>{reports.dailySales.invoices.length === 0 ? <p style={{ color: '#64748b' }}>No sales for this date.</p> : <><button onClick={() => exportCsv('daily-sales', reports.dailySales.invoices)} style={{ marginBottom: '10px' }}>Export CSV</button>{reports.dailySales.invoices.map((row) => <p key={row.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{row.invoice_number} · {row.items_count} items</span><strong>Rs. {row.net_amount}</strong></p>)}</>}</div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)' }}><h3 style={{ marginTop: 0 }}>Monthly Sales ({reportMonth})</h3>{reports.monthlySales.dailySales.length === 0 ? <p style={{ color: '#64748b' }}>No sales for this month.</p> : <><button onClick={() => exportCsv('monthly-sales', reports.monthlySales.dailySales)} style={{ marginBottom: '10px' }}>Export CSV</button>{reports.monthlySales.dailySales.map((row) => <p key={row.date} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{String(row.date).slice(0, 10)} · {row.invoice_count} invoices</span><strong>Rs. {row.total_sales}</strong></p>)}</>}</div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)' }}><h3 style={{ marginTop: 0 }}>Profit & Financial Summary</h3><p>Total Income: <strong>Rs. {reports.financial.totalIncome || 0}</strong></p><p>Expenses: <strong>Rs. {reports.financial.totalExpenses || 0}</strong></p><p>COGS: <strong>Rs. {reports.financial.profitLoss.cogs || 0}</strong></p><p>Net Profit: <strong>Rs. {reports.financial.profitLoss.netProfit || 0}</strong></p><button onClick={() => setActiveTab('profit-loss')}>Open Profit & Loss</button></div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)' }}><h3 style={{ marginTop: 0 }}>Database Backup & Restore</h3><button onClick={createBackup} style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create Backup</button>{backupMessage && <p style={{ color: '#475569' }}>{backupMessage}</p>}{backups.length === 0 ? <p style={{ color: '#64748b' }}>No local backups yet.</p> : backups.map((backup) => <div key={backup.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}><span style={{ fontSize: '12px' }}>{backup.name}</span><button onClick={() => restoreBackup(backup.name)} style={{ color: '#991b1b' }}>Restore</button></div>)}</div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)', marginTop: '20px', overflowX: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}><h3 style={{ marginTop: 0 }}>Product-wise Sales</h3><button onClick={() => exportCsv('product-sales', reports.productSales.products)}>Export CSV</button></div>{reports.productSales.products.length === 0 ? <p style={{ color: '#64748b' }}>No product sales recorded.</p> : <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Product</th><th align="right">Quantity Sold</th><th align="right">Sales Total</th></tr></thead><tbody>{reports.productSales.products.map((row) => <tr key={row.id}><td style={{ padding: '8px 0' }}>{row.name} ({row.product_code})</td><td align="right">{row.quantity_sold}</td><td align="right">Rs. {row.sales_total}</td></tr>)}</tbody></table>}</div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,.05)', marginTop: '20px', overflowX: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}><h3 style={{ marginTop: 0 }}>Current Inventory & Low Stock</h3><button onClick={() => exportCsv('inventory-report', reports.inventory.products)}>Export CSV</button></div>{reports.inventory.products.length === 0 ? <p style={{ color: '#64748b' }}>No active inventory products.</p> : <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Product</th><th align="right">Stock</th><th align="right">Threshold</th><th align="right">Inventory Value</th></tr></thead><tbody>{reports.inventory.products.map((row) => <tr key={row.id} style={{ color: Number(row.stock_quantity) <= Number(row.low_stock_threshold) ? '#991b1b' : '#1e293b' }}><td style={{ padding: '8px 0' }}>{row.name} ({row.product_code})</td><td align="right">{row.stock_quantity}</td><td align="right">{row.low_stock_threshold}</td><td align="right">Rs. {row.inventory_value}</td></tr>)}</tbody></table>}</div>
            </div>
          )}

          {activeTab === 'profit-loss' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Profit & Loss</h2>
              <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>Calculated from recorded invoices, COGS transactions, and expenses.</p>
              {reportError && <p style={{ color: '#991b1b', background: '#fee2e2', padding: '10px', borderRadius: '6px' }}>{reportError}</p>}
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', maxWidth: '650px' }}>
                {[['Total Sales', profitLoss.totalSales], ['Cost of Goods Sold', profitLoss.cogs], ['Gross Profit', profitLoss.grossProfit], ['Expenses', profitLoss.expenses], ['Net Profit', profitLoss.netProfit]].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: label === 'Net Profit' ? 'none' : '1px solid #e2e8f0', fontWeight: label === 'Gross Profit' || label === 'Net Profit' ? 'bold' : 'normal', color: label === 'Net Profit' && Number(value) < 0 ? '#991b1b' : '#1e293b' }}>
                    <span>{label}</span><span>Rs. {value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'balance-sheet' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Balance Sheet</h2>
              <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>Basic position based on recorded cash movements and current inventory value.</p>
              {reportError && <p style={{ color: '#991b1b', background: '#fee2e2', padding: '10px', borderRadius: '6px' }}>{reportError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 14px 0', color: '#1e293b' }}>Assets</h3>
                  <p>Cash: <strong>Rs. {balanceSheet.assets.cash}</strong></p><p>Inventory: <strong>Rs. {balanceSheet.assets.inventory}</strong></p><hr /><p><strong>Total Assets: Rs. {balanceSheet.assets.total}</strong></p>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 14px 0', color: '#1e293b' }}>Liabilities & Equity</h3>
                  <p>Liabilities: <strong>Rs. {balanceSheet.liabilities.total}</strong></p><p>Equity: <strong>Rs. {balanceSheet.equity}</strong></p><hr /><p><strong>Total: Rs. {balanceSheet.equation.liabilitiesAndEquity}</strong></p>
                </div>
              </div>
              <p style={{ marginTop: '20px', padding: '12px', borderRadius: '6px', background: Number(balanceSheet.equation.assets) === Number(balanceSheet.equation.liabilitiesAndEquity) ? '#dcfce7' : '#fee2e2', color: Number(balanceSheet.equation.assets) === Number(balanceSheet.equation.liabilitiesAndEquity) ? '#166534' : '#991b1b' }}>
                Assets (Rs. {balanceSheet.equation.assets}) = Liabilities + Equity (Rs. {balanceSheet.equation.liabilitiesAndEquity})
              </p>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Income</p>
                  <h3 style={{ margin: '8px 0 0 0', color: '#166534', fontSize: '24px' }}>Rs. {accountSummary.totalIncome}</h3>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Expense</p>
                  <h3 style={{ margin: '8px 0 0 0', color: '#991b1b', fontSize: '24px' }}>Rs. {accountSummary.totalExpense}</h3>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Purchase Cost (COGS)</p>
                  <h3 style={{ margin: '8px 0 0 0', color: '#b45309', fontSize: '24px' }}>Rs. {accountSummary.totalPurchaseCost}</h3>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold' }}>Net Balance</p>
                  <h3 style={{ margin: '8px 0 0 0', color: '#1e293b', fontSize: '24px' }}>Rs. {accountSummary.netBalance}</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Record New Expense</h4>
                  <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Expense Title / Description" value={newExpense.title} onChange={(e) => setNewExpense({...newExpense, title: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {expenseCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </select>
                    <input type="number" inputMode="numeric" placeholder="Amount (Rs.)" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="submit" style={{ padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Expense</button>
                  </form>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Record Other Income</h4>
                  <form onSubmit={handleAddIncome} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Income Title / Description" value={newIncome.title} onChange={(e) => setNewIncome({...newIncome, title: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="number" inputMode="numeric" placeholder="Amount (Rs.)" value={newIncome.amount} onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="date" value={newIncome.date} onChange={(e) => setNewIncome({...newIncome, date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="submit" style={{ padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '38px' }}>Add Income</button>
                  </form>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Financial Transactions Ledger</h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="ALL">All Types</option>
                      <option value="Sales Income">Sales Income</option>
                      <option value="Other Income">Other Income</option>
                      <option value="Expense">Expense</option>
                      <option value="Purchase Cost">Purchase Cost</option>
                    </select>
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button onClick={fetchTransactions} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Filter</button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Type</th>
                        <th style={{ padding: '12px' }}>Reference / Category</th>
                        <th style={{ padding: '12px' }}>Description</th>
                        <th style={{ padding: '12px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No transactions found.</td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', color: '#64748b' }}>{tx.date ? tx.date.split('T')[0] : ''}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ 
                                background: tx.type === 'Sales Income' || tx.type === 'Other Income' ? '#dcfce7' : '#fee2e2', 
                                color: tx.type === 'Sales Income' || tx.type === 'Other Income' ? '#166534' : '#991b1b', 
                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
                              }}>
                                {tx.type}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: '500', color: '#1e293b' }}>{tx.ref}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>{tx.desc}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: tx.type === 'Sales Income' || tx.type === 'Other Income' ? '#166534' : '#991b1b' }}>
                              {tx.type === 'Sales Income' || tx.type === 'Other Income' ? '+' : '-'} Rs. {tx.amount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }
