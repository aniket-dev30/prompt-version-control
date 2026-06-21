'use strict';

const express = require('express');
const { param } = require('express-validator');
const { evaluateVersion, getEvaluation } = require('../controllers/evaluationController');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(auth);

const paramValidation = [
  param('promptId').isUUID().withMessage('Invalid prompt ID.'),
  param('versionNumber').isInt({ min: 1 }).withMessage('Version number must be a positive integer.'),
];

// POST /api/prompts/:promptId/versions/:versionNumber/evaluate — run evaluation
router.post('/evaluate', paramValidation, validate, evaluateVersion);

// GET  /api/prompts/:promptId/versions/:versionNumber/evaluation — get saved evaluation
router.get('/evaluation', paramValidation, validate, getEvaluation);

module.exports = router;