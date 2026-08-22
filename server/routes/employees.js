const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Mock data storage (will query PostgreSQL pool in production)
const employees = [];

// GET /api/employees - View all employees (Admin & Manager only)
router.get('/', authenticateToken, authorizeRoles('Admin', 'Manager'), (req, res) => {
    res.status(200).json(employees);
});

// POST /api/employees - Add employee (Admin only)
router.post('/', authenticateToken, authorizeRoles('Admin'), (req, res) => {
    const { userId, departmentId, jobTitle, salary } = req.body;

    if (!userId || !jobTitle || !salary) {
        return res.status(400).json({ error: 'Missing required employee fields.' });
    }

    const newEmployee = {
        id: employees.length + 1,
        userId,
        departmentId: departmentId || null,
        jobTitle,
        salary,
        hireDate: new Date().toISOString().split('T')[0]
    };

    employees.push(newEmployee);
    res.status(201).json({ message: 'Employee added successfully', employee: newEmployee });
});

module.exports = router;