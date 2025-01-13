require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const recommendationRoutes = require('./routes/recommendationRoutes');
const authRoutes = require('./routes/authRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-connect')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create session store
const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-connect',
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
});

// Make session store globally available
global.sessionStore = sessionStore;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://campusconnect.duckdns.org'
        : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.campusconnect.duckdns.org' : undefined,
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

// API Routes first
// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Auth routes (no auth check needed)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/recommendations', authRoutes.checkAuth, recommendationRoutes);
app.use('/api/calendar', authRoutes.checkAuth, calendarRoutes);

// Static files after API routes
app.use(express.static(path.join(__dirname, '../../dist')));

// Catch-all route for client-side routing LAST
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}); 