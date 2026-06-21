'use strict';

const express                      = require('express');
const { body, param }              = require('express-validator');
const { executeVersion, getOutputs } = require('../controllers/executionController');
const auth                         = require('../middleware/auth');
const validate                     = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

// All execution routes are protected
router.use(auth);

// ── Validation chains ─────────────────────────────────────────────────────────

const executeValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  param('versionNumber')
    .isInt({ min: 1 }).withMessage('Version number must be a positive integer.'),

  body('input_variables')
    .optional()
    .isObject().withMessage('input_variables must be an object.'),

  body('model')
    .optional()
    .isString().withMessage('Model must be a string.'),
];

const getOutputsValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  param('versionNumber')
    .isInt({ min: 1 }).withMessage('Version number must be a positive integer.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/prompts/:promptId/versions/:versionNumber/execute — run a version
router.post('/execute',
  executeValidation, validate, executeVersion);

// GET  /api/prompts/:promptId/versions/:versionNumber/outputs — get all outputs
router.get('/outputs',
  getOutputsValidation, validate, getOutputs);

module.exports = router;