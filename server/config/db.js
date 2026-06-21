'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // change 5000 → 10000
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  process.exit(1);
});

/**
 * Run a single query
 * @param {string} text - SQL query
 * @param {Array} params - query parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Query: ${text} | Duration: ${duration}ms | Rows: ${result.rowCount}`);
    }
    return result;
  } catch (err) {
    console.error('❌ Query error:', { text, error: err.message });
    throw err;
  }
};

/**
 * Get a client for transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  // Override release to log long-held clients
  const timeout = setTimeout(() => {
    console.error('❌ Client checked out for more than 5 seconds — possible connection leak.');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release();
  };

  client.query = (text, params) => originalQuery(text, params);
  return client;
};

module.exports = { pool, query, getClient };