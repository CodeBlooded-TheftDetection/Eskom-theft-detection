require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Test route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// LOGIN API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    console.log("EMAIL FROM POSTMAN:", email);

    const cleanEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .single();

    console.log("USER FROM SUPABASE:", user);
    console.log("ERROR:", error);

    if (!user) {
        return res.status(401).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
        return res.status(401).json({ message: 'Wrong password' });
    }

    const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET
    );

    res.json({ token });
});

app.post('/api/test', (req, res) => {
    res.send('POST WORKING');
});

app.get('/api/properties', async (req, res) => {
    const { data, error } = await supabase
        .from('properties')
        .select('*');

    if (error) {
        return res.status(500).json({ message: error.message });
    }

    res.json(data);
});

// START SERVER
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
