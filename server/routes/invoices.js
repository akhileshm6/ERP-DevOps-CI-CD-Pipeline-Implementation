const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Mock invoicing storage
const invoices = [];

// GET /api/invoices - List all invoices
router.get('/', authenticateToken, (req, res) => {
    res.status(200).json(invoices);
});

// POST /api/invoices - Create new invoice (Admin & Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    const { clientName, amountDue } = req.body;

    if (!clientName || !amountDue) {
        return res.status(400).json({ error: 'Client name and amount due are required.' });
    }

    const newInvoice = {
        id: invoices.length + 1,
        invoiceNumber: `INV-${Date.now()}`,
        clientName,
        amountDue: Number(amountDue),
        status: 'Unpaid',
        issuedDate: new Date().toISOString().split('T')[0]
    };

    invoices.push(newInvoice);
    res.status(201).json({ message: 'Invoice generated successfully', invoice: newInvoice });
});

module.exports = router;