const db = require('./db');
const { signSession, verifySessionToken, nowIso } = require('./antiCheat');
const { v4: uuidv4 } = require('uuid');

async function createSession(instanceId, teamId){
  // fetch instance
  const { rows } = await db.query('SELECT payload FROM instances WHERE id=$1', [instanceId]);
  if(!rows.length) throw new Error('instance not found');
  const payload = rows[0].payload;
  // total time = sum of estimates (fallback 600)
  let total = (payload.locks || []).reduce((s,l)=>s+(l.estimate_seconds||120), 0) || 600;
  // Test-mode overrides for CI/test to keep runs fast and deterministic
  const isTest = (process.env.APP_MODE === 'test' || process.env.CI === 'true');
  if(isTest){
    total = Number(process.env.TEST_TOTAL_SECONDS || 15);
  }
  // If a teamId is provided, prevent multiple active sessions for the same team
  const effectiveTeam = teamId || payload.teamId || 'team_unknown';
  if (effectiveTeam) {
    const existing = await db.query('SELECT id, token, remaining_seconds FROM sessions WHERE team_id=$1 AND remaining_seconds > 0 LIMIT 1', [effectiveTeam]);
    if (existing.rows && existing.rows.length) {
      // return existing active session instead of creating a new one
      return {sessionId: existing.rows[0].id, token: existing.rows[0].token, alreadyActive: true};
    }
  }

  const sessionId = uuidv4();
  const token = signSession(sessionId);
  const start = new Date().toISOString();
  const insert = `INSERT INTO sessions(id, instance_id, team_id, token, total_seconds, remaining_seconds, start_time, last_heartbeat) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`;
  await db.query(insert, [sessionId, instanceId, effectiveTeam, token, total, total, start, start]);

  // initialize session_states entries
  const locks = payload.locks || [];
  for(let i=0;i<locks.length;i++){
    const l = locks[i];
    await db.query('INSERT INTO session_states(session_id, lock_index, lock_type, state) VALUES($1,$2,$3,$4)', [sessionId, i, l.type, 'locked']);
  }
  return {sessionId, token};
}

async function getSession(sessionId){
  const { rows } = await db.query('SELECT * FROM sessions WHERE id=$1', [sessionId]);
  if(!rows.length) return null;
  const s = rows[0];
  const states = await db.query('SELECT lock_index, lock_type, state, answer, updated_at FROM session_states WHERE session_id=$1 ORDER BY lock_index', [sessionId]);
  return {...s, states: states.rows};
}

async function heartbeat(sessionId){
  // recompute remaining_seconds based on last_heartbeat
  const { rows } = await db.query('SELECT start_time, last_heartbeat, remaining_seconds FROM sessions WHERE id=$1', [sessionId]);
  if(!rows.length) throw new Error('session not found');
  const now = new Date();
  const last = new Date(rows[0].last_heartbeat);
  const elapsed = Math.floor((now - last)/1000);
  const remaining = Math.max(0, rows[0].remaining_seconds - elapsed);
  await db.query('UPDATE sessions SET remaining_seconds=$1, last_heartbeat=$2 WHERE id=$3', [remaining, now.toISOString(), sessionId]);
  return {remaining};
}

async function recordFocus(sessionId, lost){
  if(!lost) return {ok:true};
  const { rows } = await db.query('SELECT focus_lost_count FROM sessions WHERE id=$1', [sessionId]);
  if(!rows.length) throw new Error('session not found');
  const next = rows[0].focus_lost_count + 1;
  // threshold configurable; lower in test mode
  const threshold = Number(process.env.FOCUS_THRESHOLD || 3);
  const flagged = next >= threshold; // flag after threshold
  await db.query('UPDATE sessions SET focus_lost_count=$1, flagged=$2 WHERE id=$3', [next, flagged, sessionId]);
  return {focus_lost_count: next, flagged};
}

async function submitAnswer(sessionId, lock_index, answer){
  // fetch instance and lock expected
  const srows = await db.query('SELECT instance_id, flagged, remaining_seconds FROM sessions WHERE id=$1', [sessionId]);
  if(!srows.rows.length) throw new Error('session not found');
  const flagged = srows.rows[0].flagged;
  const remaining_seconds = srows.rows[0].remaining_seconds;
  if(flagged) return {ok:false, reason:'session flagged'};
  if(remaining_seconds <= 0) return {ok:false, reason:'expired'};
  const instanceId = srows.rows[0].instance_id;
  const irows = await db.query('SELECT payload FROM instances WHERE id=$1', [instanceId]);
  const payload = irows.rows[0].payload;
  const lock = payload.locks[lock_index];
  if(!lock) return {ok:false, reason:'lock not found'};

  let correct = false;
  // simple validation based on lock type
  if(lock.type === 'logic' || lock.type === 'code'){
    correct = Number(answer) === Number(lock.expected);
  } else if(lock.type === 'cipher'){
    correct = String(answer).toUpperCase() === String(lock.expected).toUpperCase();
  } else if(lock.type === 'block'){
    // expected stored as dash-separated labels
    correct = String(answer) === String(lock.expected);
  } else if(lock.type === 'mcq'){
    // for mcq, answer is array of indices or index per question; simple case: answer equals array of correctIndex
    if(Array.isArray(answer)){
      const correctArr = lock.questions.map(q=>q.correctIndex);
      correct = JSON.stringify(answer) === JSON.stringify(correctArr);
    } else if(typeof answer === 'number'){
      // single-question polls
      correct = (lock.questions[0] && answer === lock.questions[0].correctIndex);
    }
  }

  const newState = correct ? 'unlocked' : 'failed';
  await db.query('UPDATE session_states SET state=$1, answer=$2, updated_at=$3 WHERE session_id=$4 AND lock_index=$5', [newState, JSON.stringify(answer), nowIso(), sessionId, lock_index]);
  return {ok:true, correct, state:newState};
}

module.exports = { createSession, getSession, heartbeat, recordFocus, submitAnswer };
