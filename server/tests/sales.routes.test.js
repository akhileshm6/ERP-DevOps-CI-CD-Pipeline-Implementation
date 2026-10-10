const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => next(),
    authorizeRoles: () => (req, res, next) => next()
}));

jest.mock('../db/repositories', () => ({
    inventoryRepository: {
        list: jest.fn(),
        listLowStock: jest.fn(),
        create: jest.fn()
    },
    salesRepository: {
        list: jest.fn(),
        create: jest.fn()
    }
}));

const { salesRepository } = require('../db/repositories');
const invoiceRoutes = require('../routes/invoices');

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);

describe('sales invoice route handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('passes a valid range and filters to the DB layer', async () => {
        const invoices = [{ id: 1, clientName: 'Acme', amountDue: 50, status: 'Unpaid' }];
        salesRepository.list.mockResolvedValue(invoices);

        const response = await request(app)
            .get('/api/invoices?range=month&status=Unpaid&clientName=Acme');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(invoices);
        expect(salesRepository.list).toHaveBeenCalledWith({
            range: 'month',
            status: 'Unpaid',
            clientName: 'Acme'
        });
    });

    it.each([
        'range=quarter',
        'range=',
        'status=Pending',
        'clientName=',
        'sort=createdAt'
    ])('rejects invalid sales query input: %s', async (query) => {
        const response = await request(app).get(`/api/invoices?${query}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(salesRepository.list).not.toHaveBeenCalled();
    });

    it('creates a sales invoice through the DB layer', async () => {
        const invoice = { id: 1, clientName: 'Acme', amountDue: 150, status: 'Unpaid' };
        salesRepository.create.mockResolvedValue(invoice);

        const response = await request(app).post('/api/invoices').send({
            clientName: ' Acme ',
            amountDue: '150'
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.invoice).toEqual(invoice);
        expect(salesRepository.create).toHaveBeenCalledWith({ clientName: 'Acme', amountDue: 150 });
    });

    it('rejects invalid sales payloads before calling the DB layer', async () => {
        const response = await request(app).post('/api/invoices').send({
            clientName: 'Acme',
            amountDue: '0'
        });

        expect(response.statusCode).toBe(400);
        expect(salesRepository.create).not.toHaveBeenCalled();
    });
});
