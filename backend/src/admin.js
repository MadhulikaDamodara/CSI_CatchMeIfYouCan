// Backend admin routes - protected endpoints for judges/admins
const express = require('express');
const router = express.Router();
const db = require('./db');

// Middleware: Verify admin secret
const verifyAdminSecret = (req, res, next) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'tecstasy2026';
  
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin secret' });
  }
  next();
};

// GET /api/admin/sessions - List all active sessions
router.get('/sessions', verifyAdminSecret, async (req, res) => {
  try {
    const query = `
      SELECT 
        sessions.id,
        sessions.team_id,
        sessions.total_seconds,
        sessions.remaining_seconds,
        sessions.focus_lost_count,
        sessions.flagged,
        sessions.created_at,
        COUNT(CASE WHEN session_states.state = 'correct' THEN 1 END) as locks_solved
      FROM sessions
      LEFT JOIN session_states ON sessions.id = session_states.session_id
      WHERE sessions.remaining_seconds > 0
      GROUP BY sessions.id
      ORDER BY sessions.created_at DESC
    `;
    
    const { rows } = await db.query(query);
    res.json({
      total_sessions: rows.length,
      sessions: rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Admin sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/admin/sessions/:id - Get detailed session info
router.get('/sessions/:id', verifyAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get session info
    const sessionQuery = `SELECT * FROM sessions WHERE id = $1`;
    const { rows: sessionRows } = await db.query(sessionQuery, [id]);
    
    if (!sessionRows.length) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionRows[0];
    
    // Get per-lock states
    const statesQuery = `
      SELECT lock_index, state, answer, updated_at 
      FROM session_states 
      WHERE session_id = $1 
      ORDER BY lock_index
    `;
    const { rows: states } = await db.query(statesQuery, [id]);
    
    res.json({
      session,
      lock_states: states,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Admin session detail error:', err);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// GET /api/admin/leaderboard - Real-time leaderboard
router.get('/leaderboard', verifyAdminSecret, async (req, res) => {
  try {
    const query = `
      SELECT 
        sessions.team_id,
        MAX(sessions.created_at) as last_session,
        COUNT(*) as total_attempts,
        MAX(
          CASE 
            WHEN COUNT(session_states.*) = SUM(CASE WHEN session_states.state = 'correct' THEN 1 ELSE 0 END)
            THEN EXTRACT(EPOCH FROM (MAX(sessions.total_seconds) - MAX(sessions.remaining_seconds)))
            ELSE NULL
          END
        ) as fastest_completion_time,
        AVG(sessions.focus_lost_count) as avg_focus_loss,
        SUM(CASE WHEN sessions.flagged THEN 1 ELSE 0 END) as flagged_count
      FROM sessions
      LEFT JOIN session_states ON sessions.id = session_states.session_id
      GROUP BY sessions.team_id
      ORDER BY fastest_completion_time ASC NULLS LAST
    `;
    
    const { rows } = await db.query(query);
    
    res.json({
      leaderboard: rows.map((row, idx) => ({
        rank: idx + 1,
        team_id: row.team_id,
        completion_time: row.fastest_completion_time ? Math.round(row.fastest_completion_time) : null,
        attempts: row.total_attempts,
        avg_focus_loss: row.avg_focus_loss ? parseFloat(row.avg_focus_loss).toFixed(2) : 0,
        flagged_count: row.flagged_count || 0
      })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/admin/stats - Overall event statistics
router.get('/stats', verifyAdminSecret, async (req, res) => {
  try {
    const queries = {
      totalSessions: 'SELECT COUNT(*) as count FROM sessions',
      activeSessions: 'SELECT COUNT(*) as count FROM sessions WHERE remaining_seconds > 0',
      completedSessions: 'SELECT COUNT(DISTINCT session_id) as count FROM session_states WHERE state = \'correct\' AND lock_index = 4',
      avgFocusLoss: 'SELECT AVG(focus_lost_count) as avg FROM sessions',
      flaggedSessions: 'SELECT COUNT(*) as count FROM sessions WHERE flagged = true'
    };
    
    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const { rows } = await db.query(query);
      results[key] = rows[0];
    }
    
    res.json({
      total_sessions: parseInt(results.totalSessions.count),
      active_sessions: parseInt(results.activeSessions.count),
      completed_sessions: parseInt(results.completedSessions.count || 0),
      avg_focus_loss: parseFloat(results.avgFocusLoss.avg || 0).toFixed(2),
      flagged_sessions: parseInt(results.flaggedSessions.count),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/export - Export all session data as JSON
router.get('/export', verifyAdminSecret, async (req, res) => {
  try {
    const sessionsQuery = 'SELECT * FROM sessions ORDER BY created_at';
    const statesQuery = 'SELECT * FROM session_states ORDER BY session_id, lock_index';
    
    const { rows: sessions } = await db.query(sessionsQuery);
    const { rows: states } = await db.query(statesQuery);
    
    res.json({
      export_date: new Date().toISOString(),
      sessions,
      session_states: states,
      metadata: {
        total_sessions: sessions.length,
        total_answers: states.length
      }
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/admin/flag-session/:id - Manually flag a session
router.post('/flag-session/:id', verifyAdminSecret, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const query = 'UPDATE sessions SET flagged = true WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`[ADMIN] Manually flagged session ${id}. Reason: ${reason || 'not provided'}`);
    res.json({ success: true, session: rows[0] });
  } catch (err) {
    console.error('Flag session error:', err);
    res.status(500).json({ error: 'Failed to flag session' });
  }
});

module.exports = router;
