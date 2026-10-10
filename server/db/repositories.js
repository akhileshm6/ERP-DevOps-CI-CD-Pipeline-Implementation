// Persistence boundary for routes and services.
// Postgres by default; the in-memory store under Jest (NODE_ENV=test) or when
// DATA_STORE=memory, so tests and quick demos need no database.

const useMemory = process.env.DATA_STORE === 'memory' || process.env.NODE_ENV === 'test';

module.exports = useMemory ? require('./memoryRepositories') : require('./pgRepositories');
module.exports.store = useMemory ? 'memory' : 'postgres';
