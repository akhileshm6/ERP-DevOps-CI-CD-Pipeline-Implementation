const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isNonNegativeInteger = (value) => (
    typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
);

const hasOnlyAllowedKeys = (query, allowedKeys) => (
    Object.keys(query).every((key) => allowedKeys.includes(key))
);

const validateInventoryFilters = (query) => {
    const allowedKeys = ['sku', 'name', 'lowStock', 'minQuantity', 'maxQuantity'];
    if (!hasOnlyAllowedKeys(query, allowedKeys)) {
        return { error: 'Unsupported inventory filter.' };
    }

    if (query.sku !== undefined && !isNonEmptyString(query.sku)) {
        return { error: 'sku must be a non-empty string.' };
    }
    if (query.name !== undefined && !isNonEmptyString(query.name)) {
        return { error: 'name must be a non-empty string.' };
    }
    if (query.lowStock !== undefined && query.lowStock !== 'true' && query.lowStock !== 'false') {
        return { error: 'lowStock must be true or false.' };
    }
    if (query.minQuantity !== undefined && !isNonNegativeInteger(query.minQuantity)) {
        return { error: 'minQuantity must be a non-negative integer.' };
    }
    if (query.maxQuantity !== undefined && !isNonNegativeInteger(query.maxQuantity)) {
        return { error: 'maxQuantity must be a non-negative integer.' };
    }
    if (query.minQuantity !== undefined && query.maxQuantity !== undefined
        && Number(query.minQuantity) > Number(query.maxQuantity)) {
        return { error: 'minQuantity cannot be greater than maxQuantity.' };
    }

    return {
        filters: {
            ...(query.sku !== undefined && { sku: query.sku.trim() }),
            ...(query.name !== undefined && { name: query.name.trim() }),
            ...(query.lowStock !== undefined && { lowStock: query.lowStock === 'true' }),
            ...(query.minQuantity !== undefined && { minQuantity: Number(query.minQuantity) }),
            ...(query.maxQuantity !== undefined && { maxQuantity: Number(query.maxQuantity) })
        }
    };
};

const validateSalesFilters = (query) => {
    const allowedKeys = ['range', 'status', 'clientName'];
    const validRanges = ['day', 'week', 'month', 'year'];
    const validStatuses = ['Unpaid', 'Paid', 'Overdue', 'Cancelled'];

    if (!hasOnlyAllowedKeys(query, allowedKeys)) {
        return { error: 'Unsupported sales filter.' };
    }
    if (query.range !== undefined && !validRanges.includes(query.range)) {
        return { error: 'range must be one of: day, week, month, year.' };
    }
    if (query.status !== undefined && !validStatuses.includes(query.status)) {
        return { error: 'status must be one of: Unpaid, Paid, Overdue, Cancelled.' };
    }
    if (query.clientName !== undefined && !isNonEmptyString(query.clientName)) {
        return { error: 'clientName must be a non-empty string.' };
    }

    return {
        filters: {
            ...(query.range !== undefined && { range: query.range }),
            ...(query.status !== undefined && { status: query.status }),
            ...(query.clientName !== undefined && { clientName: query.clientName.trim() })
        }
    };
};

module.exports = { validateInventoryFilters, validateSalesFilters };
