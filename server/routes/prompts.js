'use strict';

const express        = require('express');
const { body, param, query } = require('express-validator');
const {
  createPrompt,
  getPrompts,
  getPrompt,
  updatePrompt,
  deletePrompt,
} = require('../controllers/promptController');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All prompt routes are protected
router.use(auth);

// ── Validation chains ─────────────────────────────────────────────────────────

const createValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Prompt name is required.')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters.'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array.')
    .custom(tags => tags.every(t => typeof t === 'string'))
    .withMessage('Each tag must be a string.'),

  body('is_public')
    .optional()
    .isBoolean().withMessage('is_public must be a boolean.'),
];

const updateValidation = [
  param('id')
    .isUUID().withMessage('Invalid prompt ID.'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters.'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array.'),

  body('is_public')
    .optional()
    .isBoolean().withMessage('is_public must be a boolean.'),
];

const idValidation = [
  param('id')
    .isUUID().withMessage('Invalid prompt ID.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST   /api/prompts          — create prompt
router.post('/',    createValidation, validate, createPrompt);

// GET    /api/prompts          — get all prompts (with pagination + filters)
router.get('/',     getPrompts);

// GET    /api/prompts/:id      — get single prompt with all versions
router.get('/:id',  idValidation, validate, getPrompt);

// PATCH  /api/prompts/:id      — update prompt metadata
router.patch('/:id', updateValidation, validate, updatePrompt);

// DELETE /api/prompts/:id      — delete prompt
router.delete('/:id', idValidation, validate, deletePrompt);

module.exports = router;