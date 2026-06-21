'use strict';

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const dotenv   = require('dotenv');

// Load env variables before anything else
dotenv.config();

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth required) ──────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

// ── API routes (placeholders for now, filled in later steps) ─────────────────
// ── API routes ────────────────────────────────────────────────────────────────
// ── API routes ────────────────────────────────────────────────────────────────
// ── API routes ────────────────────────────────────────────────────────────────
// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',                                        require('./routes/auth'));
app.use('/api/prompts',                                     require('./routes/prompts'));
app.use('/api/prompts/:promptId/versions',                  require('./routes/versions'));
app.use('/api/prompts/:promptId/versions/:versionNumber',   require('./routes/executions'));
app.use('/api/prompts/:promptId/shares',                    require('./routes/shares'));
app.use('/api/prompts/:promptId/versions/:versionNumber', require('./routes/evaluations'));
// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  // Postgres errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry — resource already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource does not exist.' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;