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
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
router.post('/:id/suggest-improvements', async (req, res) => {
  try {
    const {
      draft_system_prompt,
      draft_user_prompt,
      retrieved_examples = []
    } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const examplesText = retrieved_examples.length
      ? retrieved_examples.map(v => `
Version: ${v.name}
System: ${v.system_prompt || ''}
User: ${v.user_prompt}
Similarity: ${v.score}
`).join('\n----------------\n')
      : 'No similar versions found';

    const prompt = `
You are an expert prompt engineer.

Analyze the draft prompt and provide improvement suggestions.

CURRENT DRAFT

System Prompt:
${draft_system_prompt || 'None'}

User Prompt:
${draft_user_prompt}

SIMILAR PREVIOUS VERSIONS

${examplesText}

Return ONLY valid JSON.

{
  "suggestions": [
    {
      "title": "Short title",
      "explanation": "Detailed explanation"
    }
  ]
}

Do not return markdown.
Do not return code fences.
Do not return any text outside JSON.
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    console.log("Gemini Response:");
    console.log(text);

    try {
      const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      return res.json(parsed);
    } catch (parseError) {

      console.log("JSON parse failed, using fallback");

      const suggestions = text
        .split(/\n\n+/)
        .filter(line => line.trim().length > 20)
        .slice(0, 5)
        .map((line, index) => ({
          title: `Suggestion ${index + 1}`,
          explanation: line.trim()
        }));

      return res.json({
        suggestions: suggestions.length
          ? suggestions
          : [
              {
                title: "AI Analysis",
                explanation: text
              }
            ]
      });
    }

  } catch (error) {
    console.error("Suggestion Error:", error);

    return res.status(500).json({
      error: "Failed to generate suggestions"
    });
  }
});
module.exports = router;