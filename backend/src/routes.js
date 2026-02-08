const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateInstance } = require('./generator');
const sessions = require('./sessions');

router.post('/instances', async (req, res) => {
  try {
    const teamId = req.body.teamId || `team_${Math.floor(Math.random()*10000)}`;
    const instance = generateInstance(teamId);
    const text = `INSERT INTO instances(id, team_id, payload, difficulty, created_at) VALUES($1,$2,$3,$4,$5)`;
    const vals = [instance.id, instance.teamId, JSON.stringify(instance), instance.difficulty, instance.createdAt];
    await db.query(text, vals);
    res.json({instanceId: instance.id});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'failed to create instance'});
  }
});

router.get('/instances/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await db.query('SELECT payload FROM instances WHERE id=$1', [id]);
    if(!rows.length) return res.status(404).json({error:'not found'});
    res.json(rows[0].payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'failed to fetch'});
  }
});

// Sessions API
router.post('/sessions', async (req, res) => {
  try {
    const { instanceId, teamId } = req.body;
    if(!instanceId) return res.status(400).json({error:'instanceId required'});
    const session = await sessions.createSession(instanceId, teamId);
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'failed to create session'});
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const s = await sessions.getSession(req.params.id);
    if(!s) return res.status(404).json({error:'not found'});
    res.json(s);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'failed to fetch session'});
  }
});

router.post('/sessions/:id/heartbeat', async (req, res) => {
  try {
    const updated = await sessions.heartbeat(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'heartbeat failed'});
  }
});

router.post('/sessions/:id/focus', async (req, res) => {
  try {
    const {lost} = req.body; // boolean
    const updated = await sessions.recordFocus(req.params.id, !!lost);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'focus update failed'});
  }
});

router.post('/sessions/:id/answer', async (req, res) => {
  try {
    const { lock_index, answer } = req.body;
    const result = await sessions.submitAnswer(req.params.id, lock_index, answer);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'answer submit failed'});
  }
});

module.exports = router;
