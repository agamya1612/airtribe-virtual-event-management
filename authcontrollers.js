const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { users } = require('../data/memoryStore');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.example.com', // Replace with real SMTP if needed
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function register(req, res) {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Missing fields' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: users.length + 1, name, email, passwordHash, role };
    users.push(newUser);

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name}, you have successfully registered.`
        });
    } catch (err) {
        console.error('Email sending failed:', err);
    }

    res.status(201).json({ message: 'User registered successfully' });
}

async function login(req, res) {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
}

module.exports = { register, login };
