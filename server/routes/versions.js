'use strict';

const express        = require('express');
const { body, param, query } = require('express-validator');
const {
  createVersion,
  getVersions,
  getVersion,
  diffVersions,
  deleteVersion,
  generateChangelog,
} = require('../controllers/versionController');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router({ mergeParams: true }); // mergeParams to access promptId

// All version routes are protected
router.use(auth);

// ── Validation chains ─────────────────────────────────────────────────────────

const createVersionValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),

  body('user_prompt')
    .trim()
    .notEmpty().withMessage('user_prompt is required.')
    .isLength({ min: 1, max: 10000 }).withMessage('user_prompt must be under 10000 characters.'),

  body('system_prompt')
    .optional()
    .trim()
    .isLength({ max: 10000 }).withMessage('system_prompt must be under 10000 characters.'),

  body('commit_message')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Commit message must be under 200 characters.'),

  body('model')
    .optional()
    .isString().withMessage('Model must be a string.'),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2.'),

  body('max_tokens')
    .optional()
    .isInt({ min: 1 }).withMessage('max_tokens must be a positive integer.'),

  body('variables')
    .optional()
    .isObject().withMessage('Variables must be an object.'),
];

const versionParamValidation = [
  param('promptId')
    .isUUID().withMessage('Invalid prompt ID.'),
  param('versionNumber')
    .isInt({ min: 1 }).withMessage('Version number must be a positive integer.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST   /api/prompts/:promptId/versions         — create new version
router.post('/',
  createVersionValidation, validate, createVersion);

// GET    /api/prompts/:promptId/versions         — get all versions
router.get('/',
  [param('promptId').isUUID().withMessage('Invalid prompt ID.')], validate, getVersions);

// GET    /api/prompts/:promptId/versions/diff?v1=1&v2=2  — diff two versions
router.get('/diff',
  [param('promptId').isUUID().withMessage('Invalid prompt ID.')], validate, diffVersions);

// GET /api/prompts/:promptId/versions/changelog?v1=1&v2=2 — AI-generated changelog
router.get('/changelog',
  [param('promptId').isUUID().withMessage('Invalid prompt ID.')], validate, generateChangelog);

// GET    /api/prompts/:promptId/versions/:versionNumber  — get single version
router.get('/:versionNumber',
  versionParamValidation, validate, getVersion);
// DELETE /api/prompts/:promptId/versions/:versionNumber — delete a version
router.delete('/:versionNumber', versionParamValidation, validate, deleteVersion);
module.exports = router;