const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { salesRepository } = require('../db/repositories');
const { validateSalesFilters } = require('./queryValidation');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveNumber = (value) => (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value)) && Number(value) > 0
);

// GET /api/invoices - List sales invoices. Filters: range, status, clientName.
router.get('/', authenticateToken, async (req, res) => {
    const validation = validateSalesFilters(req.query);
    if (validation.error) return res.status(400).json({ error: validation.error });

    try {
        const invoices = await salesRepository.list(validation.filters);
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ error: 'Unable to retrieve invoices.' });
    }
});

// POST /api/invoices - Create new invoice (Admin & Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
    const { clientName, amountDue } = req.body;

    if (!isNonEmptyString(clientName) || !isPositiveNumber(amountDue)) {
        return res.status(400).json({ error: 'Client name and a positive amount due are required.' });
    }

    try {
        const newInvoice = await salesRepository.create({
            clientName: clientName.trim(),
            amountDue: Number(amountDue)
        });
        res.status(201).json({ message: 'Invoice generated successfully', invoice: newInvoice });
    } catch (err) {
        res.status(500).json({ error: 'Unable to generate invoice.' });
    }
});

module.exports = router;
