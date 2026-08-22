const express = require('express');
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
        // Placeholder DB connectivity check; returns ready true
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

// Only listen when executed directly (allows supertest in Jest)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;