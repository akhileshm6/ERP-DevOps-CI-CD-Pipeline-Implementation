const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Mock data storage (will query PostgreSQL pool in production)
const inventory = [];

// GET /api/inventory - View all stock items
router.get('/', authenticateToken, (req, res) => {
    res.status(200).json(inventory);
});

// GET /api/inventory/low-stock - Get items below minimum stock threshold
router.get('/low-stock', authenticateToken, (req, res) => {
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStockLevel);
    res.status(200).json(lowStockItems);
});

// POST /api/inventory - Add new inventory item (Admin & Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    const { sku, name, quantity, minStockLevel, unitPrice } = req.body;

    if (!sku || !name || quantity === undefined || !unitPrice) {
        return res.status(400).json({ error: 'Missing required inventory fields.' });
    }

    const newItem = {
        id: inventory.length + 1,
        sku,
        name,
        quantity: Number(quantity),
        minStockLevel: minStockLevel ? Number(minStockLevel) : 10,
        unitPrice: Number(unitPrice),
        createdAt: new Date().toISOString()
    };

    inventory.push(newItem);
    res.status(201).json({ message: 'Inventory item added successfully', item: newItem });
});

module.exports = router;