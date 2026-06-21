'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const {
  sharePrompt,
  getShares,
  updateShare,
  removeShare,
  getSharedWithMe,
} = require('../controllers/shareController');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

// All share routes are protected
router.use(auth);

// ── Validation chains ─────────────────────────────────────────────────────────

const shareValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.')
    .normalizeEmail(),

  body('permission')
    .optional()
    .isIn(['view', 'edit']).withMessage('Permission must be view or edit.'),
];

const updateShareValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  param('shareId')
    .isUUID().withMessage('Invalid share ID.'),

  body('permission')
    .notEmpty().withMessage('Permission is required.')
    .isIn(['view', 'edit']).withMessage('Permission must be view or edit.'),
];

const shareIdValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  param('shareId')
    .isUUID().withMessage('Invalid share ID.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST   /api/prompts/:promptId/shares              — share prompt with a user
router.post('/',
  shareValidation, validate, sharePrompt);

// GET    /api/prompts/:promptId/shares              — get all shares for prompt
router.get('/',
  [param('promptId').isUUID().withMessage('Invalid prompt ID.')], validate, getShares);

// PATCH  /api/prompts/:promptId/shares/:shareId     — update permission
router.patch('/:shareId',
  updateShareValidation, validate, updateShare);

// DELETE /api/prompts/:promptId/shares/:shareId     — remove share
router.delete('/:shareId',
  shareIdValidation, validate, removeShare);



module.exports = router;