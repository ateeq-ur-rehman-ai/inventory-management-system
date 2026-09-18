import React, { useState, useEffect } from 'react';
import { getProducts, addProduct } from './services/api';
import './App.css';
import BatchManager from './BatchManager';
import axios from 'axios';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    purchase_price: '',
    wholesale_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_threshold: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.data || res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchProducts();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setLoginError('');
        fetchProducts();
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Server error during login');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleEditClick = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      sku: p.sku || '',
      category: p.category || '',
      purchase_price: p.purchase_price || p.cost_price || '',
      wholesale_price: p.wholesale_price || '',
      selling_price: p.selling_price || '',
      stock_quantity: p.stock_quantity || '',
      low_stock_threshold: p.low_stock_threshold || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        await axios.put(`http://localhost:5000/api/products/update/${editingId}`, form);
        alert('Product updated successfully!');
        setEditingId(null);
      } else {
        await addProduct(form);
        alert('Product added successfully!');
      }
      setForm({
        name: '',
        sku: '',
        category: '',
        purchase_price: '',
        wholesale_price: '',
        selling_price: '',
        stock_quantity: '',
        low_stock_threshold: ''
      });
      fetchProducts();
    } catch (err) {
      alert('Error saving product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`http://localhost:5000/api/products/delete/${id}`);
        fetchProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
        alert('Failed to delete product');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-badge">NC</div>
            <h2>New Style Bike Cover</h2>
            <p>Please sign in to your inventory portal</p>
          </div>
          {loginError && <div className="error-alert">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" placeholder="Enter username" value={username} 
                onChange={(e) => setUsername(e.target.value)} required 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" placeholder="Enter password" value={password} 
                onChange={(e) => setPassword(e.target.value)} required 
              />
            </div>
            <button type="submit" className="primary-btn">Sign In to Account</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Mobile Top Navbar */}
      <div className="mobile-navbar">
        <div className="mobile-brand">
          <div className="logo-badge-sm">NC</div>
          <span>Bike Cover Management</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-toggle-btn">
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-badge">NC</div>
          <div className="sidebar-brand-text">
            <h2>New Style</h2>
            <span>Bike Cover Management</span>
          </div>
        </div>
        
        <div className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('inventory'); setSidebarOpen(false); }}
            className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          >
            Products & Stock
          </button>
          <button 
            onClick={() => { setActiveTab('batches'); setSidebarOpen(false); }}
            className={`nav-btn ${activeTab === 'batches' ? 'active' : ''}`}
          >
            Batch Manager (FEFO)
          </button>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          Sign Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="content-wrapper">
          
          {/* Top Header Card */}
          <div className="card header-card">
            <div>
              <h1>{activeTab === 'inventory' ? 'New Style Bike Cover - Inventory' : 'Batch Tracking Dashboard'}</h1>
              <p>Manage bike cover stock levels, pricing tiers, and inventory efficiently.</p>
            </div>
            <div className="live-badge">
              <span className="live-dot"></span>
              <span>Store Live</span>
            </div>
          </div>

          {activeTab === 'inventory' ? (
            <>
              {/* Quick Metrics Cards */}
              <div className="metrics-grid">
                <div className="card metric-card">
                  <span className="metric-title">Total Inventory Items</span>
                  <div className="metric-body">
                    <h3>{products.length}</h3>
                    <span className="badge-blue">Active</span>
                  </div>
                </div>
                <div className="card metric-card">
                  <span className="metric-title">Categories Count</span>
                  <div className="metric-body">
                    <h3 className="text-blue">
                      {new Set(products.map(p => p.category).filter(Boolean)).size}
                    </h3>
                    <span className="badge-green">Categorized</span>
                  </div>
                </div>
              </div>

              {/* Add / Edit Form Card */}
              <div className="card form-card">
                <h3>{editingId ? 'Edit Product' : 'Add New Bike Cover / Product'}</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Product Name</label>
                      <input 
                        type="text" placeholder="e.g. Heavy Duty Bike Cover" value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Product Code / SKU</label>
                      <input 
                        type="text" placeholder="e.g. BC-101" value={form.sku} 
                        onChange={(e) => setForm({ ...form, sku: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input 
                        type="text" placeholder="e.g. Waterproof Covers" value={form.category} 
                        onChange={(e) => setForm({ ...form, category: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label>Purchase Price (PKR)</label>
                      <input 
                        type="number" placeholder="0.00" value={form.purchase_price} 
                        onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Wholesale Price (PKR)</label>
                      <input 
                        type="number" placeholder="0.00" value={form.wholesale_price} 
                        onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Retail Price (PKR)</label>
                      <input 
                        type="number" placeholder="0.00" value={form.selling_price} 
                        onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Stock Quantity</label>
                      <input 
                        type="number" placeholder="0" value={form.stock_quantity} 
                        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Low-Stock Threshold</label>
                      <input 
                        type="number" placeholder="5" value={form.low_stock_threshold} 
                        onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} required 
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={loading} className={`submit-btn ${editingId ? 'warning' : 'primary'}`}>
                      {loading ? 'Saving...' : (editingId ? 'Update Product' : 'Save Product')}
                    </button>
                    {editingId && (
                      <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', sku: '', category: '', purchase_price: '', wholesale_price: '', selling_price: '', stock_quantity: '', low_stock_threshold: '' }); }} className="cancel-btn">
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Products Table Card */}
              <div className="card table-card">
                <h3>New Style Bike Cover - Stock List</h3>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Name / Code</th>
                        <th>Category</th>
                        <th>Purchase</th>
                        <th>Wholesale</th>
                        <th>Retail</th>
                        <th>Stock</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length > 0 ? (
                        products.map((p, index) => {
                          const isLowStock = Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5);
                          return (
                            <tr key={p.id} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td>
                                <div className="product-name">{p.name}</div>
                                <div className="product-sku">{p.sku}</div>
                              </td>
                              <td>
                                <span className="category-badge">{p.category || 'General'}</span>
                              </td>
                              <td className="text-muted">Rs. {Number(p.purchase_price || p.cost_price || 0).toLocaleString()}</td>
                              <td className="font-weight-600">Rs. {Number(p.wholesale_price || 0).toLocaleString()}</td>
                              <td className="text-green font-weight-700">Rs. {Number(p.selling_price || 0).toLocaleString()}</td>
                              <td>
                                <div className="stock-wrapper">
                                  <span className="font-weight-800">{p.stock_quantity ?? 0}</span>
                                  {isLowStock && <span className="badge-red">Low</span>}
                                </div>
                              </td>
                              <td className="text-center">
                                <button onClick={() => handleEditClick(p)} className="action-btn edit-btn">Edit</button>
                                <button onClick={() => handleDelete(p.id)} className="action-btn delete-btn">Delete</button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center empty-row">No bike covers found in inventory yet. Add your first item above!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <BatchManager />
            </div>
          )}

        </div>
      </div>

      {/* Internal Clean Responsive CSS */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #F8FAFC; color: #0F172A; }
        
        .app-container { display: flex; min-height: 100vh; width: 100%; position: relative; overflow-x: hidden; }
        
        /* Sidebar Fixed Layout & Overlap Fix */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: #0F172A;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
          transition: transform 0.3s ease-in-out;
        }
        .sidebar-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; padding-left: 4px; overflow: hidden; }
        .sidebar-brand-text { white-space: nowrap; overflow: hidden; }
        .sidebar-brand h2 { font-size: 15px; font-weight: 800; margin: 0; line-height: 1.2; }
        .sidebar-brand span { font-size: 11px; color: #94A3B8; font-weight: 500; display: block; }
        
        .logo-badge { width: 36px; height: 36px; min-width: 36px; background: #2563EB; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; color: #fff; }
        .logo-badge-sm { width: 30px; height: 30px; background: #2563EB; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: #fff; }

        .sidebar-nav { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .nav-btn { background: transparent; color: #FFFFFF; border: none; padding: 12px 14px; text-align: left; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; white-space: nowrap; transition: background 0.2s; }
        .nav-btn.active, .nav-btn:hover { background: #2563EB; }

        .logout-btn { background: rgba(220, 38, 38, 0.1); color: #F87171; padding: 12px 16px; border: 1px solid rgba(220, 38, 38, 0.2); cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; text-align: center; }

        /* Main Content Area */
        .main-content {
          flex: 1;
          margin-left: 260px;
          padding: 30px;
          display: flex;
          justify-content: center;
          min-width: 0;
        }
        .content-wrapper { width: 100%; max-width: 1150px; display: flex; flex-direction: column; gap: 20px; }

        /* Cards & Common */
        .card { background: #FFFFFF; padding: 24px 25px; border-radius: 12px; border: 1px solid #E2E8F0; width: 100%; }
        .header-card { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .header-card h1 { margin: 0; color: #0F172A; font-size: 24px; font-weight: 900; letter-spacing: -0.3px; }
        .header-card p { margin: 6px 0 0 0; color: #64748B; font-size: 13.5px; font-weight: 500; }

        .live-badge { display: flex; align-items: center; gap: 8px; background: #F8FAFC; padding: 6px 12px; border-radius: 8px; border: 1px solid #E2E8F0; }
        .live-dot { width: 8px; height: 8px; background: #16A34A; border-radius: 50%; }

        /* Metrics Grid */
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; width: 100%; }
        .metric-card { padding: 20px; }
        .metric-title { color: #64748B; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .metric-body { display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px; }
        .metric-body h3 { margin: 0; font-size: 24px; font-weight: 800; color: #0F172A; }

        /* Forms */
        .form-card h3, .table-card h3 { margin: 0 0 16px 0; color: #0F172A; font-size: 16px; font-weight: 800; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .form-group label { display: block; font-size: 11.5px; font-weight: 600; color: #64748B; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0; outline: none; font-size: 13px; background: #F8FAFC; color: #0F172A; }
        
        .form-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .submit-btn { padding: 10px 22px; border: none; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; color: #fff; }
        .submit-btn.primary { background: #2563EB; }
        .submit-btn.warning { background: #D97706; }
        .cancel-btn { background: #E2E8F0; color: #0F172A; padding: 10px 22px; border: none; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; }

        /* Tables */
        .table-responsive { width: 100%; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; min-width: 800px; }
        thead tr { background: #0F172A; color: #FFFFFF; }
        th { padding: 10px 12px; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        th:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
        th:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; width: 120px; text-align: center; }
        td { padding: 12px; border-bottom: 1px solid #F1F5F9; }
        .row-even { background: #FFFFFF; }
        .row-odd { background: #FAFAFA; }

        .product-name { font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 2px; }
        .product-sku { font-size: 10.5px; color: #64748B; font-family: monospace; }
        .category-badge { background: #F1F5F9; color: #334155; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        
        .stock-wrapper { display: flex; align-items: center; gap: 6px; }
        
        .action-btn { padding: 5px 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11.5px; margin-right: 4px; }
        .edit-btn { background-color: #FEF3C7; color: #D97706; }
        .delete-btn { background-color: #FEE2E2; color: #DC2626; }

        /* Utilities */
        .text-muted { color: #64748B; }
        .text-blue { color: #2563EB; }
        .text-green { color: #16A34A; }
        .text-center { text-align: center; }
        .font-weight-600 { font-weight: 600; }
        .font-weight-700 { font-weight: 700; }
        .font-weight-800 { font-weight: 800; }

        .badge-blue { background: #EFF6FF; color: #2563EB; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #F0FDF4; color: #16A34A; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-red { background: #FEE2E2; color: #DC2626; padding: 2px 4px; border-radius: 4px; font-size: 10px; font-weight: 700; }
        .empty-row { padding: 30px; color: #64748B; font-size: 13px; }

        /* Login Screen */
        .login-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100vw; background: #F8FAFC; padding: 16px; }
        .login-card { background: #FFFFFF; padding: 40px 30px; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05); border: 1px solid #E2E8F0; }
        .login-header { text-align: center; margin-bottom: 25px; }
        .login-header h2 { color: #0F172A; font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
        .login-header p { color: #64748B; font-size: 13px; margin: 0; }
        .error-alert { background: #FEE2E2; color: #DC2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 15px; text-align: center; font-weight: 500; }
        .primary-btn { width: 100%; padding: 12px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }

        /* Mobile Navbar (Hidden on Desktop) */
        .mobile-navbar { display: none; }
        .sidebar-overlay { display: none; }

        /* Responsive Media Queries */
        @media (max-width: 900px) {
          .sidebar {
            transform: translateX(-100%);
            box-shadow: none;
          }
          .sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 20px rgba(0,0,0,0.2);
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
            z-index: 99;
          }
          .mobile-navbar {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            background: #0F172A;
            color: #FFFFFF;
            padding: 15px 20px;
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 110;
          }
          .mobile-brand { display: flex; align-items: center; gap: 10px; }
          .mobile-brand span { font-weight: 700; font-size: 13px; }
          .menu-toggle-btn { background: #2563EB; color: #FFFFFF; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; }

          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 15px !important;
            padding-top: 75px !important;
          }
        }
      `}</style>
    </div>
  );
}