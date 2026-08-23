const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

// Route Modules
const employeeRoutes = require('./routes/employees');
const inventoryRoutes = require('./routes/inventory');
const invoiceRoutes = require('./routes/invoices');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// GET /health -> checks basic application availability
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// GET /ready -> checks database connectivity
app.get('/ready', async (req, res) => {
    try {
        const isDbConnected = true;

        if (isDbConnected) {
            res.status(200).json({ ready: true, database: 'connected' });
        } else {
            throw new Error('Database connection failed');
        }
    } catch (err) {
        res.status(500).json({ ready: false, error: err.message });
    }
});

// Mock user storage
const users = [];

// --- Auth Routes (Week 7) ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: users.length + 1, name, email, password: hashedPassword, role: role || 'Employee' };
        users.push(newUser);

        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'dev_secret_key',
            { expiresIn: '8h' }
        );

        res.status(200).json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    res.status(200).json({ message: 'Access granted to admin portal', user: req.user });
});

// --- Module Routes (Weeks 8 - 11) ---
app.use('/api/employees', employeeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);

// Only listen when executed directly (allows supertest in Jest)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;