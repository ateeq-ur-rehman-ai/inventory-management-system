import React, { useState, useEffect } from 'react';

function BatchManager() {
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        product_id: '',
        batch_number: '',
        quantity: '',
        cost_price: '',
        expiry_date: ''
    });

    // Products fetch karo dropdown ke liye
    useEffect(() => {
        fetch('http://localhost:5000/api/products')
            .then(res => res.json())
            .then(data => setProducts(data.data || []))
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok) {
                alert('Stock Batch added successfully!');
                setFormData({ product_id: '', batch_number: '', quantity: '', cost_price: '', expiry_date: '' });
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error adding stock batch');
        }
    };

    return (
        <div style={{ padding: '20px', background: '#1e1e1e', color: '#fff', marginTop: '20px', borderRadius: '8px' }}>
            <h3>Add Stock Batch (FEFO Tracking)</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
                <select 
                    value={formData.product_id} 
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    required
                    style={{ padding: '8px' }}
                >
                    <option value="">Select Product</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                </select>

                <input 
                    type="text" 
                    placeholder="Batch Number" 
                    value={formData.batch_number}
                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                    required
                    style={{ padding: '8px' }}
                />

                <input 
                    type="number" 
                    placeholder="Quantity" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    style={{ padding: '8px' }}
                />

                <input 
                    type="number" 
                    placeholder="Cost Price" 
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    required
                    style={{ padding: '8px' }}
                />

                <input 
                    type="date" 
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    required
                    style={{ padding: '8px' }}
                />

                <button type="submit" style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Save Stock Batch
                </button>
            </form>
        </div>
    );
}

export default BatchManager;