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

const { inventoryRepository } = require('../db/repositories');
const inventoryRoutes = require('../routes/inventory');

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

describe('inventory route handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('passes validated inventory filters to the DB layer', async () => {
        const items = [{ id: 1, sku: 'SKU-1', quantity: 5 }];
        inventoryRepository.list.mockResolvedValue(items);

        const response = await request(app)
            .get('/api/inventory?sku=SKU-1&lowStock=false&minQuantity=1&maxQuantity=10');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(items);
        expect(inventoryRepository.list).toHaveBeenCalledWith({
            sku: 'SKU-1',
            lowStock: false,
            minQuantity: 1,
            maxQuantity: 10
        });
    });

    it.each([
        'lowStock=yes',
        'minQuantity=-1',
        'minQuantity=20&maxQuantity=10',
        'unknown=value'
    ])('rejects invalid inventory query input: %s', async (query) => {
        const response = await request(app).get(`/api/inventory?${query}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(inventoryRepository.list).not.toHaveBeenCalled();
    });

    it('gets low-stock items from the DB layer after validating filters', async () => {
        const items = [{ id: 2, sku: 'LOW-1', quantity: 1, minStockLevel: 3 }];
        inventoryRepository.listLowStock.mockResolvedValue(items);

        const response = await request(app).get('/api/inventory/low-stock?name=widget');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(items);
        expect(inventoryRepository.listLowStock).toHaveBeenCalledWith({ name: 'widget' });
    });

    it('creates a normalized inventory item through the DB layer', async () => {
        const item = {
            id: 1,
            sku: 'SKU-1',
            name: 'Widget',
            quantity: 4,
            minStockLevel: 10,
            unitPrice: 12.5
        };
        inventoryRepository.create.mockResolvedValue(item);

        const response = await request(app).post('/api/inventory').send({
            sku: ' SKU-1 ',
            name: ' Widget ',
            quantity: '4',
            unitPrice: '12.50'
        });

        expect(response.statusCode).toBe(201);
        expect(response.body.item).toEqual(item);
        expect(inventoryRepository.create).toHaveBeenCalledWith({
            sku: 'SKU-1',
            name: 'Widget',
            quantity: 4,
            minStockLevel: 10,
            unitPrice: 12.5
        });
    });

    it('rejects invalid inventory fields before calling the DB layer', async () => {
        const response = await request(app).post('/api/inventory').send({
            sku: 'SKU-1',
            name: 'Widget',
            quantity: null,
            unitPrice: 'free'
        });

        expect(response.statusCode).toBe(400);
        expect(inventoryRepository.create).not.toHaveBeenCalled();
    });
});
