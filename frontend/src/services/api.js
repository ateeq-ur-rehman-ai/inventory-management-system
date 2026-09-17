import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api'
});

export const getProducts = () => API.get('/products');
export const addProduct = (productData) => API.post('/products', productData);

export default API;