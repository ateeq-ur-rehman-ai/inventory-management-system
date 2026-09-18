const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login Route
router.post('/login', async (req, logRes) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return logRes.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Database se user find karo
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            return logRes.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];

        // Password check: Dono bcrypt aur plain text support karega taake kabhi error na aaye
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            isMatch = false;
        }

        // Fallback agar database mein seedha plain text 'admin123' rakha ho
        if (!isMatch && password === user.password) {
            isMatch = true;
        }

        if (!isMatch) {
            return logRes.status(401).json({ error: 'Invalid username or password' });
        }

        // JWT Token generate karo
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET || 'YOUR_SECRET_KEY', 
            { expiresIn: '8h' }
        );

        logRes.status(200).json({ 
            message: 'Login successful', 
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (err) {
        console.error('Login error:', err);
        logRes.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;