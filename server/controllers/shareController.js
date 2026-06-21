'use strict';

const { query } = require('../config/db');

// ── Share a prompt with a user ─────────────────────────────────────────────────

const sharePrompt = async (req, res) => {
  try {
    const { promptId }           = req.params;
    const { email, permission }  = req.body;
    const ownerId                = req.user.id;

    // Verify prompt ownership
    const promptCheck = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, ownerId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Find user to share with by email
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'No user found with that email.' });
    }

    const targetUser = userResult.rows[0];

    // Prevent sharing with yourself
    if (targetUser.id === ownerId) {
      return res.status(400).json({ error: 'You cannot share a prompt with yourself.' });
    }

    // Upsert share (update permission if already shared)
    const result = await query(
      `INSERT INTO prompt_shares (prompt_id, shared_with, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (prompt_id, shared_with)
       DO UPDATE SET permission = EXCLUDED.permission
       RETURNING id, permission, created_at`,
      [promptId, targetUser.id, permission || 'view']
    );

    res.status(201).json({
      message:    `Prompt shared with ${targetUser.name} successfully.`,
      share: {
        id:          result.rows[0].id,
        shared_with: {
          id:    targetUser.id,
          name:  targetUser.name,
          email: targetUser.email,
        },
        permission:  result.rows[0].permission,
        created_at:  result.rows[0].created_at,
      },
    });
  } catch (err) {
    console.error('❌ Share prompt error:', err.message);
    res.status(500).json({ error: 'Failed to share prompt.' });
  }
};

// ── Get all shares for a prompt ───────────────────────────────────────────────

const getShares = async (req, res) => {
  try {
    const { promptId } = req.params;
    const ownerId      = req.user.id;

    // Verify prompt ownership
    const promptCheck = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, ownerId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `SELECT
         ps.id, ps.permission, ps.created_at,
         u.id AS user_id, u.name, u.email
       FROM prompt_shares ps
       JOIN users u ON u.id = ps.shared_with
       WHERE ps.prompt_id = $1
       ORDER BY ps.created_at DESC`,
      [promptId]
    );

    res.json({
      shares: result.rows.map(r => ({
        id:         r.id,
        permission: r.permission,
        created_at: r.created_at,
        shared_with: {
          id:    r.user_id,
          name:  r.name,
          email: r.email,
        },
      })),
    });
  } catch (err) {
    console.error('❌ Get shares error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shares.' });
  }
};

// ── Update share permission ───────────────────────────────────────────────────

const updateShare = async (req, res) => {
  try {
    const { promptId, shareId } = req.params;
    const { permission }        = req.body;
    const ownerId               = req.user.id;

    // Verify prompt ownership
    const promptCheck = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, ownerId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `UPDATE prompt_shares
       SET permission = $1
       WHERE id = $2 AND prompt_id = $3
       RETURNING id, permission`,
      [permission, shareId, promptId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Share not found.' });
    }

    res.json({
      message: 'Permission updated successfully.',
      share:   result.rows[0],
    });
  } catch (err) {
    console.error('❌ Update share error:', err.message);
    res.status(500).json({ error: 'Failed to update share.' });
  }
};

// ── Remove a share ────────────────────────────────────────────────────────────

const removeShare = async (req, res) => {
  try {
    const { promptId, shareId } = req.params;
    const ownerId               = req.user.id;

    // Verify prompt ownership
    const promptCheck = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, ownerId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      'DELETE FROM prompt_shares WHERE id = $1 AND prompt_id = $2 RETURNING id',
      [shareId, promptId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Share not found.' });
    }

    res.json({ message: 'Share removed successfully.' });
  } catch (err) {
    console.error('❌ Remove share error:', err.message);
    res.status(500).json({ error: 'Failed to remove share.' });
  }
};

// ── Get prompts shared with me ────────────────────────────────────────────────

const getSharedWithMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
         p.id, p.name, p.description, p.tags, p.created_at, p.updated_at,
         ps.permission,
         u.name AS owner_name, u.email AS owner_email,
         COUNT(pv.id)::int AS version_count
       FROM prompt_shares ps
       JOIN prompts p      ON p.id  = ps.prompt_id
       JOIN users u        ON u.id  = p.user_id
       LEFT JOIN prompt_versions pv ON pv.prompt_id = p.id
       WHERE ps.shared_with = $1
       GROUP BY p.id, ps.permission, u.name, u.email
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    res.json({ prompts: result.rows });
  } catch (err) {
    console.error('❌ Get shared with me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shared prompts.' });
  }
};

module.exports = {
  sharePrompt,
  getShares,
  updateShare,
  removeShare,
  getSharedWithMe,
};