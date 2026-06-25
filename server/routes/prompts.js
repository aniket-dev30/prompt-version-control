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

    if (!draft_user_prompt || !draft_user_prompt.trim()) {
      return res.status(400).json({ error: 'draft_user_prompt is required.' });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  suggestion: { type: 'string' },
                  based_on: { type: 'string' },
                },
                required: ['suggestion', 'based_on'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
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
You are an expert prompt engineer helping a user improve a draft prompt by learning from their own past prompt-writing patterns.

CURRENT DRAFT

System Prompt:
${draft_system_prompt || 'None'}

User Prompt:
${draft_user_prompt}

SIMILAR PREVIOUS VERSIONS FROM THE USER'S OWN HISTORY

${examplesText}

Based on patterns you notice in the user's past prompts (tone, constraints, output format, variables), suggest 2-4 specific, actionable improvements to the draft. Reference a specific version (e.g. "v2") in based_on when a suggestion is grounded in one of the similar previous versions above; otherwise use "general best practice".

Return ONLY valid JSON matching this shape:
{
  "suggestions": [
    { "suggestion": "<specific actionable suggestion>", "based_on": "<version name or 'general best practice'>" }
  ]
}
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
        .map((line) => ({
          suggestion: line.trim(),
          based_on: 'general best practice',
        }));

      return res.json({
        suggestions: suggestions.length
          ? suggestions
          : [
              {
                suggestion: text,
                based_on: 'general best practice',
              }
            ]
      });
    }

  } catch (error) {
    console.error("Suggestion Error:", error);

    if (error.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    }
    if (error.message?.includes('quota')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded.' });
    }
    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('high demand')) {
      return res.status(503).json({ error: 'Gemini is temporarily overloaded. Please try again in a moment.' });
    }

    return res.status(500).json({
      error: "Failed to generate suggestions"
    });
  }
});
module.exports = router;