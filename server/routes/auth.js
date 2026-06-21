'use strict';

const express                      = require('express');
const { body }                     = require('express-validator');
const { register, login, me }      = require('../controllers/authController');
const auth                         = require('../middleware/auth');
const validate                     = require('../middleware/validate');
const { getSharedWithMe }     = require('../controllers/shareController');
const router = express.Router();

// ── Validation chains ─────────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

// GET /api/auth/me  (protected)
router.get('/me', auth, me);

// GET /api/auth/shared-with-me — prompts shared with current user
router.get('/shared-with-me', auth, getSharedWithMe);

module.exports = router;