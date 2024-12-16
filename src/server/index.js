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
    origin: 'https://campusconnect.duckdns.org',
    credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        domain: '.campusconnect.duckdns.org',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

// Apply auth check to protected routes
app.use('/api/recommendations', authRoutes.checkAuth, recommendationRoutes);
app.use('/api/calendar', authRoutes.checkAuth, calendarRoutes);

// Auth routes (no auth check needed)
app.use('/api/auth', authRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}); 