import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        product_code: '',
        name: '',
        purchase_price: '',
        wholesale_price: '',
        retail_price: '',
        stock_quantity: '',
        low_stock_threshold: ''
    });

    const fetchProducts = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/products');
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`http://localhost:5000/api/products/update/${editId}`, form);
                setEditId(null);
            } else {
                await axios.post('http://localhost:5000/api/products/add', form);
            }
            setForm({ product_code: '', name: '', purchase_price: '', wholesale_price: '', retail_price: '', stock_quantity: '', low_stock_threshold: '' });
            fetchProducts();
        } catch (err) {
            alert('Error saving product');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Product Management</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <input placeholder="Product Code" value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })} required disabled={editId !== null} />
                <input placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <input type="number" placeholder="Purchase Price" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} required />
                <input type="number" placeholder="Wholesale Price" value={form.wholesale_price} onChange={e => setForm({ ...form, wholesale_price: e.target.value })} required />
                <input type="number" placeholder="Retail Price" value={form.retail_price} onChange={e => setForm({ ...form, retail_price: e.target.value })} required />
                <input type="number" placeholder="Stock Quantity" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                <input type="number" placeholder="Low Stock Threshold" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} />
                <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', background: editId ? 'orange' : 'green', color: '#fff' }}>
                    {editId ? 'Update Product' : 'Add Product'}
                </button>
            </form>

            <h3>Product List</h3>
            <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Purchase</th>
                        <th>Retail</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.product_code}</td>
                            <td>{p.name}</td>
                            <td>{p.purchase_price}</td>
                            <td>{p.retail_price}</td>
                            <td style={{ color: p.stock_quantity <= p.low_stock_threshold ? 'red' : 'black' }}>
                                {p.stock_quantity} {p.stock_quantity <= p.low_stock_threshold && '(Low Stock)'}
                                <br />
                                <input
                                    type="number"
                                    placeholder="+/-"
                                    style={{ width: '50px', marginRight: '5px', marginTop: '5px' }}
                                    id={`adjust-${p.id}`}
                                />
                                <button onClick={async () => {
                                    const val = document.getElementById(`adjust-${p.id}`).value;
                                    if (!val) return;
                                    const type = val > 0 ? 'add' : 'subtract';
                                    await axios.put(`http://localhost:5000/api/products/adjust-stock/${p.id}`, {
                                        quantity_change: Math.abs(val),
                                        type: type
                                    });
                                    fetchProducts();
                                }} style={{ padding: '2px 5px' }}>Adjust</button>
                            </td>
                            <td>
                                <button onClick={() => {
                                    setEditId(p.id);
                                    setForm({
                                        product_code: p.product_code,
                                        name: p.name,
                                        purchase_price: p.purchase_price,
                                        wholesale_price: p.wholesale_price,
                                        retail_price: p.retail_price,
                                        stock_quantity: p.stock_quantity,
                                        low_stock_threshold: p.low_stock_threshold
                                    });
                                }} style={{ background: 'orange', color: '#fff', border: 'none', padding: '5px', marginRight: '5px' }}>Edit</button>

                                <button onClick={async () => {
                                    if (confirm('Delete this product?')) {
                                        await axios.delete(`http://localhost:5000/api/products/delete/${p.id}`);
                                        fetchProducts();
                                    }
                                }} style={{ background: 'red', color: '#fff', border: 'none', padding: '5px' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}