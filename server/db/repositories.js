// This module is the persistence boundary for sales and inventory routes.
// It is intentionally in-memory until a PostgreSQL pool is configured, so route
// handlers can keep the same interface when the backing store changes.
const inventoryItems = [];
const salesInvoices = [];

const getRangeStart = (range) => {
    const now = new Date();
    const start = new Date(now);

    const daysByRange = { day: 1, week: 7, month: 30, year: 365 };
    start.setDate(now.getDate() - daysByRange[range]);
    return start;
};

const inventoryRepository = {
    async list(filters = {}) {
        return inventoryItems.filter((item) => {
            if (filters.sku && item.sku !== filters.sku) return false;
            if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.lowStock === true && item.quantity > item.minStockLevel) return false;
            if (filters.minQuantity !== undefined && item.quantity < filters.minQuantity) return false;
            if (filters.maxQuantity !== undefined && item.quantity > filters.maxQuantity) return false;
            return true;
        });
    },

    async listLowStock(filters = {}) {
        return this.list({ ...filters, lowStock: true });
    },

    async create(item) {
        const newItem = {
            id: inventoryItems.length + 1,
            ...item,
            createdAt: new Date().toISOString()
        };

        inventoryItems.push(newItem);
        return newItem;
    }
};

const salesRepository = {
    async list(filters = {}) {
        const rangeStart = filters.range ? getRangeStart(filters.range) : null;

        return salesInvoices.filter((invoice) => {
            if (filters.status && invoice.status !== filters.status) return false;
            if (filters.clientName && !invoice.clientName.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
            if (rangeStart && new Date(invoice.issuedDate) < rangeStart) return false;
            return true;
        });
    },

    async create(invoice) {
        const newInvoice = {
            id: salesInvoices.length + 1,
            invoiceNumber: `INV-${Date.now()}`,
            status: 'Unpaid',
            issuedDate: new Date().toISOString().split('T')[0],
            ...invoice
        };

        salesInvoices.push(newInvoice);
        return newInvoice;
    }
};

module.exports = { inventoryRepository, salesRepository };
