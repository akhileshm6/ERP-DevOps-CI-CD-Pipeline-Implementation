const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { employeesRepository } = require('../db/repositories');

// Staff roster, persisted in hr_staff (in memory under Jest). The same records
// drive GET /api/metrics/hr, so a new hire appears in the People view.

const STATUSES = ['Active', 'On Leave'];
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// GET /api/employees - View all employees (Admin & Manager only)
router.get('/', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
    try {
        res.status(200).json(await employeesRepository.list());
    } catch (err) {
        console.error('[employees] list failed:', err.message);
        res.status(500).json({ error: 'Unable to retrieve employees.' });
    }
});

// POST /api/employees - Add employee (Admin only)
// Body: { name, department, role (or jobTitle), salary, status?, hireDate? (YYYY-MM-DD) }
router.post('/', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const { name, department, salary, status = 'Active', hireDate } = req.body || {};
    const role = req.body?.role ?? req.body?.jobTitle;

    if (!isNonEmptyString(name) || !isNonEmptyString(department) || !isNonEmptyString(role)
        || !(Number.isFinite(Number(salary)) && Number(salary) > 0)) {
        return res.status(400).json({ error: 'name, department, role and a positive salary are required.' });
    }
    if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}.` });
    }
    if (hireDate !== undefined && !(/^\d{4}-\d{2}-\d{2}$/.test(hireDate) && !Number.isNaN(Date.parse(hireDate)))) {
        return res.status(400).json({ error: 'hireDate must be a valid YYYY-MM-DD date.' });
    }

    try {
        const employee = await employeesRepository.create({
            name: name.trim(),
            department: department.trim(),
            role: role.trim(),
            salary: Number(salary),
            status,
            hireDate: hireDate || new Date().toISOString().split('T')[0]
        });
        res.status(201).json({ message: 'Employee added successfully', employee });
    } catch (err) {
        console.error('[employees] create failed:', err.message);
        res.status(500).json({ error: 'Unable to add employee.' });
    }
});

module.exports = router;
