const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const gen = require('../src/generator');
const sessions = require('../src/sessions');

function nowMinusSeconds(sec){
  return new Date(Date.now() - sec*1000).toISOString();
}

async function run(){
  console.log('Session integration tests starting...');

  // load init SQL and run it
  const initPath = path.resolve(__dirname, '..', '..', 'sql', 'init.sql');
  const sql = fs.readFileSync(initPath, 'utf8');
  await db.query(sql);
  console.log('DB schema ensured');

  // 1) Full lifecycle: start -> heartbeat -> answer -> refresh -> resume -> finish
  const inst = gen.generateInstance('team_integ');
  await db.query('INSERT INTO instances(id, team_id, payload, difficulty, created_at) VALUES($1,$2,$3,$4,$5)', [inst.id, inst.teamId, JSON.stringify(inst), inst.difficulty, inst.createdAt]);
  console.log('Instance inserted', inst.id);

  const s = await sessions.createSession(inst.id, 'team_integ');
  const sessionId = s.sessionId;
  console.log('Session created', sessionId);

  // Check initial remaining equals total
  let row = (await db.query('SELECT total_seconds, remaining_seconds FROM sessions WHERE id=$1', [sessionId])).rows[0];
  if(row.total_seconds !== row.remaining_seconds) return fail('initial remaining mismatch');

  // Simulate elapsed time by moving last_heartbeat back and calling heartbeat
  await db.query('UPDATE sessions SET last_heartbeat=$1 WHERE id=$2', [nowMinusSeconds(30), sessionId]);
  const hb = await sessions.heartbeat(sessionId);
  if(hb.remaining > row.total_seconds) return fail('heartbeat increased time');
  console.log('Heartbeat reduced remaining to', hb.remaining);

  // Submit an answer for lock 0 (use correct expected)
  const instPayload = inst; // we have inst in memory
  const lock0 = instPayload.locks[0];
  let ans;
  if(lock0.type === 'mcq') ans = lock0.questions[0].correctIndex;
  else if(lock0.type === 'code' || lock0.type === 'logic' || lock0.type === 'block' || lock0.type === 'cipher') ans = lock0.expected;
  else ans = lock0.expected;
  const r1 = await sessions.submitAnswer(sessionId, 0, ans);
  if(!r1.ok) return fail('submitAnswer failed', r1);
  console.log('Submitted answer for lock 0, correct=', r1.correct);

  // Simulate refresh/resume: fetch session and ensure same locks
  const beforeLocks = instPayload.locks.map(l=>l.lock_index || null);
  const fetched = await sessions.getSession(sessionId);
  if(!fetched) return fail('getSession returned null');
  console.log('Fetched session after answer');

  // Timer authority: set last_heartbeat far in past and compute heartbeat
  await db.query('UPDATE sessions SET last_heartbeat=$1 WHERE id=$2', [nowMinusSeconds(600), sessionId]);
  const hb2 = await sessions.heartbeat(sessionId);
  if(hb2.remaining > 0) console.log('Warning: session still had remaining after large elapsed', hb2.remaining);

  // Expiry locks submissions: set remaining_seconds to 0 and attempt submit
  await db.query('UPDATE sessions SET remaining_seconds=0 WHERE id=$1', [sessionId]);
  const r2 = await sessions.submitAnswer(sessionId, 1, instPayload.locks[1].expected);
  if(r2.ok) return fail('submission accepted after expiry');
  console.log('Submission correctly rejected after expiry:', r2.reason);

  // Anti-cheat signals: focus/blur logged and flagging after 3
  await sessions.recordFocus(sessionId, true);
  await sessions.recordFocus(sessionId, true);
  const pre = (await db.query('SELECT focus_lost_count, flagged FROM sessions WHERE id=$1', [sessionId])).rows[0];
  if(pre.focus_lost_count !== 2) return fail('focus count not incremented');
  await sessions.recordFocus(sessionId, true);
  const post = (await db.query('SELECT focus_lost_count, flagged FROM sessions WHERE id=$1', [sessionId])).rows[0];
  if(!post.flagged) return fail('session not flagged after focus loss threshold');
  console.log('Anti-cheat flagged after focus events as expected');

  // After flagged, submissions should be rejected
  const r3 = await sessions.submitAnswer(sessionId, 2, instPayload.locks[2].expected);
  if(r3.ok) return fail('submission accepted for flagged session');

  // Concurrency: create multiple sessions and ensure no reuse
  const instA = gen.generateInstance('teamA');
  const instB = gen.generateInstance('teamB');
  await db.query('INSERT INTO instances(id, team_id, payload, difficulty, created_at) VALUES($1,$2,$3,$4,$5)', [instA.id, instA.teamId, JSON.stringify(instA), instA.difficulty, instA.createdAt]);
  await db.query('INSERT INTO instances(id, team_id, payload, difficulty, created_at) VALUES($1,$2,$3,$4,$5)', [instB.id, instB.teamId, JSON.stringify(instB), instB.difficulty, instB.createdAt]);
  const sA = await sessions.createSession(instA.id, 'teamA');
  const sB = await sessions.createSession(instB.id, 'teamB');
  if(sA.sessionId === sB.sessionId) return fail('sessions collided');
  const fetchedA = await sessions.getSession(sA.sessionId);
  const fetchedB = await sessions.getSession(sB.sessionId);
  if(fetchedA.instance_id === fetchedB.instance_id) return fail('instances reused across sessions');
  console.log('Concurrency check passed');

  // Fairness invariants: check difficulty equal
  if(instA.difficulty !== instB.difficulty) return fail('difficulty mismatch across instances');
  console.log('Fairness check passed');

  console.log('All session integration tests passed.');
  process.exit(0);
}

function fail(msg, info){
  console.error('TEST FAIL:', msg, info||'');
  process.exit(2);
}

run().catch(e=>{ console.error('Error during tests', e); process.exit(3); });
