import React, { useState, useEffect } from 'react';
import { getProducts, addProduct } from './services/api';
import './App.css';
import BatchManager from './BatchManager';

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', sku: '', category: '', cost_price: '' });
  const [loading, setLoading] = useState(false);

  // Fetch products on load
  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await addProduct(form);
      setForm({ name: '', sku: '', category: '', cost_price: '' });
      fetchProducts(); // Refresh list
      alert('Product added successfully with 10% markup!');
    } catch (err) {
      alert('Error adding product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2>📦 Inventory & Billing Management System</h2>
      
      {/* Add Product Form */}
      <form onSubmit={handleSubmit} style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Add New Product</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input 
            type="text" placeholder="Product Name" value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} required 
            style={{ padding: '8px' }}
          />
          <input 
            type="text" placeholder="SKU Code" value={form.sku} 
            onChange={(e) => setForm({ ...form, sku: e.target.value })} required 
            style={{ padding: '8px' }}
          />
          <input 
            type="text" placeholder="Category (e.g. Seat Covers)" value={form.category} 
            onChange={(e) => setForm({ ...form, category: e.target.value })} 
            style={{ padding: '8px' }}
          />
          <input 
            type="number" placeholder="Cost Price (PKR)" value={form.cost_price} 
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required 
            style={{ padding: '8px' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ background: '#28a745', color: 'white', padding: '10px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          {loading ? 'Saving...' : 'Add Product (+10% Markup Auto)'}
        </button>
      </form>

      {/* Products Table */}
      <h3>Current Inventory List</h3>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#007bff', color: 'white' }}>
            <th>ID</th>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Cost Price</th>
            <th>Selling Price (10% Markup)</th>
          </tr>
        </thead>
        <tbody>
          {products.length > 0 ? (
            products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category || 'N/A'}</td>
                <td>Rs. {p.cost_price}</td>
                <td style={{ fontWeight: 'bold', color: 'green' }}>Rs. {p.selling_price}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No products found. Add your first item above!</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Batch Manager Component (FEFO Tracking) */}
      <BatchManager />
    </div>
  );
}

export default App;