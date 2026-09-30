const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { inventoryRepository } = require('../db/repositories');
const { validateInventoryFilters } = require('./queryValidation');

const isNonNegativeInteger = (value) => (
    (typeof value === 'number' && Number.isInteger(value) && value >= 0)
    || (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value.trim()))
);
const isPositiveNumber = (value) => (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value)) && Number(value) > 0
);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// GET /api/inventory - View all stock items
router.get('/', authenticateToken, async (req, res) => {
    const validation = validateInventoryFilters(req.query);
    if (validation.error) return res.status(400).json({ error: validation.error });

    try {
        const inventory = await inventoryRepository.list(validation.filters);
        res.status(200).json(inventory);
    } catch (err) {
        res.status(500).json({ error: 'Unable to retrieve inventory.' });
    }
});

// GET /api/inventory/low-stock - Get items below minimum stock threshold
router.get('/low-stock', authenticateToken, async (req, res) => {
    const validation = validateInventoryFilters(req.query);
    if (validation.error) return res.status(400).json({ error: validation.error });

    try {
        const lowStockItems = await inventoryRepository.listLowStock(validation.filters);
        res.status(200).json(lowStockItems);
    } catch (err) {
        res.status(500).json({ error: 'Unable to retrieve low-stock inventory.' });
    }
});

// POST /api/inventory - Add new inventory item (Admin & Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
    const { sku, name, quantity, minStockLevel, unitPrice } = req.body;

    if (!isNonEmptyString(sku) || !isNonEmptyString(name) || !isNonNegativeInteger(quantity)
        || !isPositiveNumber(unitPrice) || (minStockLevel !== undefined && !isNonNegativeInteger(minStockLevel))) {
        return res.status(400).json({ error: 'Invalid inventory fields.' });
    }

    try {
        const newItem = await inventoryRepository.create({
            sku: sku.trim(),
            name: name.trim(),
            quantity: Number(quantity),
            minStockLevel: minStockLevel === undefined ? 10 : Number(minStockLevel),
            unitPrice: Number(unitPrice)
        });
        res.status(201).json({ message: 'Inventory item added successfully', item: newItem });
    } catch (err) {
        res.status(500).json({ error: 'Unable to add inventory item.' });
    }
});

module.exports = router;
