import React, { useEffect, useState, useRef } from 'react'
import { bindAntiCheatHooks, startHeartbeat, stopHeartbeat } from './anticheat'
import Admin from './Admin'

const STORAGE_KEY = 'csi_session';

function formatTime(s) {
  if (s <= 0) return '00:00';
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function LandingPage({ onStartGame }) {
  const [teamId, setTeamId] = useState('team_' + Math.floor(Math.random() * 10000));
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStartGame(teamId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-content">
        <h1>🔓 Catch Me If You Can</h1>
        <p className="subtitle">Tech Escape Hunt Challenge</p>
        <p className="description">
          Welcome to an exciting logic-driven tech escape game. Solve randomized puzzles,
          bypass locks, and prove your skills. Each team gets a unique experience with
          fair difficulty balancing.
        </p>

        <div className="team-input-group">
          <input
            type="text"
            placeholder="Enter your team name"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleStart}
          disabled={loading || !teamId.trim()}
        >
          {loading ? 'Starting...' : 'Start Challenge →'}
        </button>

        <div style={{ marginTop: '30px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
          <p>🎯 Solve 5-10 unique locks</p>
          <p>⏱️ Race against time</p>
          <p>🛡️ Fair & anti-cheat protected</p>
        </div>
      </div>
    </div>
  );
}

function LockCard({ lock, index, state, answerInputs, onAnswerChange, onSubmit, onReset }) {
  const isSolved = state?.state === 'correct';

  return (
    <div className={`lock-card ${isSolved ? 'solved' : ''} fade-in`}>
      <div className="lock-header">
        <div className="lock-title">
          <div className="lock-number">{index + 1}</div>
          <div>
            <span className="lock-type">{lock.type}</span>
            <span className={`lock-status ${isSolved ? 'unlocked' : 'locked'}`}>
              {isSolved ? '✓ Unlocked' : 'Locked'}
            </span>
          </div>
        </div>
      </div>

      <div className="lock-content">
        {lock.type === 'logic' && (
          <>
            <div className="prompt">{lock.prompt}</div>
            <input
              type="text"
              placeholder="Enter your answer..."
              value={answerInputs[index] || ''}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              disabled={isSolved}
            />
          </>
        )}

        {lock.type === 'code' && (
          <>
            <p className="prompt">Fix or analyze the code:</p>
            <div className="code-block">{lock.code}</div>
            <input
              type="text"
              placeholder="Enter your answer..."
              value={answerInputs[index] || ''}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              disabled={isSolved}
            />
          </>
        )}

        {lock.type === 'cipher' && (
          <>
            <div className="cipher-display">
              <div style={{ marginBottom: '8px', fontWeight: '600' }}>{lock.data.cipher}</div>
              <div className="cipher-hint">Hint: Shift by {lock.data.shiftHint}</div>
            </div>
            <input
              type="text"
              placeholder="Decrypt the message..."
              value={answerInputs[index] || ''}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              disabled={isSolved}
            />
          </>
        )}

        {lock.type === 'block' && (
          <>
            <p className="prompt">Arrange blocks in the correct order:</p>
            <div className="blocks-container">
              {(lock.data.blocks || []).map((b) => {
                const selected = (answerInputs[index] || []).includes(b.label);
                return (
                  <button
                    key={b.label}
                    className={`block-btn ${selected ? 'selected' : ''}`}
                    onClick={() => {
                      const cur = answerInputs[index] || [];
                      if (cur.includes(b.label)) {
                        onAnswerChange(index, cur.filter((x) => x !== b.label));
                      } else {
                        onAnswerChange(index, [...cur, b.label]);
                      }
                    }}
                    disabled={isSolved}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div className="sequence-display">
              Sequence: {(answerInputs[index] || []).join(' → ') || 'Select blocks...'}
            </div>
          </>
        )}

        {lock.type === 'mcq' && (
          <>
            {(lock.questions || []).map((q, qi) => {
              if (q.opts.length === 0) return null;
              return (
                <div key={qi} className="mcq-section">
                  <div className="mcq-question">{q.q}</div>
                  <div className="options-grid">
                    {q.opts.map((opt, oi) => {
                      const selected = Array.isArray(answerInputs[index])
                        ? answerInputs[index][qi] === oi
                        : answerInputs[index] === oi;
                      return (
                        <button
                          key={oi}
                          className={`option-btn ${selected ? 'selected' : ''}`}
                          onClick={() => {
                            const cur = answerInputs[index] || (
                              (lock.questions || []).length > 1 ? [] : null
                            );
                            if ((lock.questions || []).length > 1) {
                              const arr = Array.isArray(cur) ? cur.slice() : Array((lock.questions || []).length).fill(null);
                              arr[qi] = oi;
                              onAnswerChange(index, arr);
                            } else {
                              onAnswerChange(index, oi);
                            }
                          }}
                          disabled={isSolved}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="lock-controls">
        <button
          className="btn btn-success"
          onClick={() => {
            if (lock.type === 'block') {
              const cur = answerInputs[index] || [];
              const seq = cur.join('-');
              onAnswerChange(index, seq);
              setTimeout(() => onSubmit(index), 10);
              return;
            }
            onSubmit(index);
          }}
          disabled={isSolved}
        >
          Submit Answer
        </button>
        {lock.type === 'block' && (
          <button
            className="btn btn-secondary"
            onClick={() => onReset(index)}
            disabled={isSolved}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function CompletionScreen({ session, serverState, onNewGame }) {
  const unsolvedCount = (serverState?.states || []).filter(s => s.state !== 'correct').length;
  const solvedCount = (serverState?.states || []).length - unsolvedCount;
  const totalTime = (serverState?.total_seconds || 0) - (serverState?.remaining_seconds || 0);

  return (
    <div className="completion-modal">
      <div className="completion-content">
        <div className="completion-icon">
          {unsolvedCount === 0 ? '🎉' : '⏱️'}
        </div>
        <h1>
          {unsolvedCount === 0 ? 'Perfect! All Locks Unlocked!' : 'Challenge Complete!'}
        </h1>
        <p style={{ marginBottom: '20px', fontSize: '1rem' }}>
          {unsolvedCount === 0
            ? 'You successfully solved all puzzles!'
            : `You solved ${solvedCount} out of ${serverState?.states?.length} locks.`}
        </p>

        <div className="completion-stats">
          <div className="stat-box">
            <div className="stat-label">Time Used</div>
            <div className="stat-value">{formatTime(totalTime)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Locks Solved</div>
            <div className="stat-value">
              {solvedCount}/{serverState?.states?.length}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Focus Lost</div>
            <div className="stat-value">{serverState?.focus_lost_count || 0}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Status</div>
            <div className="stat-value" style={{ color: serverState?.flagged ? 'var(--danger)' : 'var(--success)' }}>
              {serverState?.flagged ? '🚩' : '✓'}
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={onNewGame} style={{ marginTop: '24px' }}>
          Start New Challenge
        </button>
      </div>
    </div>
  );
}

function SessionInfo({ session, serverState, onClearSession }) {
  const timeWarning = (serverState?.remaining_seconds || 0) < 300;
  const timeWarningStrong = (serverState?.remaining_seconds || 0) < 60;

  return (
    <div className="leaderboard-card">
      <div
        className="card session-info"
        style={{ cursor: 'default' }}
      >
        <div className="timer" style={{ fontSize: '2rem' }}>
          Session Active
        </div>
        <div
          className={`timer ${
            timeWarningStrong ? 'danger' : timeWarning ? 'warning' : ''
          }`}
        >
          {formatTime(serverState?.remaining_seconds || 0)}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="info-row">
            <span className="info-label">Total Time</span>
            <span className="info-value">{formatTime(serverState?.total_seconds || 0)}</span>
          </div>
        </div>

        {serverState?.focus_lost_count > 0 && (
          <div className="anticheat-alert warning">
            <strong>⚠️ Warning:</strong> Focus lost {serverState.focus_lost_count}x
          </div>
        )}

        {serverState?.flagged && (
          <div className="anticheat-alert">
            <strong>🚩 Flagged:</strong> Anti-cheat triggered
          </div>
        )}

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div className="info-row" style={{ fontSize: '0.9rem' }}>
            <span>Session ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {session?.sessionId?.substring(0, 8)}...
            </span>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm btn-block"
          onClick={onClearSession}
          style={{ marginTop: '12px' }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}

function ProgressStats({ serverState }) {
  const total = serverState?.states?.length || 0;
  const solved = (serverState?.states || []).filter(s => s.state === 'correct').length;
  const progress = total > 0 ? (solved / total) * 100 : 0;

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Progress</h3>
          <span style={{ fontWeight: '700' }}>
            {solved}/{total}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Check if accessing admin dashboard
  const params = new URLSearchParams(window.location.search);
  const adminSecret = params.get('secret');
  
  if (adminSecret) {
    return <Admin secret={adminSecret} />;
  }

  const [instance, setInstance] = useState(null);
  const [session, setSession] = useState(null);
  const [serverState, setServerState] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});
  const [showCompletion, setShowCompletion] = useState(false);
  const pollRef = useRef(null);
  const unbindRef = useRef(null);

  // Try to resume session on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s && s.sessionId) {
          fetch(`/api/sessions/${s.sessionId}`)
            .then((r) => r.json())
            .then((data) => {
              setSession(s);
              setServerState(data);

              // Fetch instance
              fetch(`/api/instances/${s.instanceId}`)
                .then((r) => r.json())
                .then((inst) => setInstance(inst));

              startPolling(s.sessionId);
              startHeartbeat(s.sessionId);
              unbindRef.current = bindAntiCheatHooks(s.sessionId);
            })
            .catch(() => {
              localStorage.removeItem(STORAGE_KEY);
            });
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return () => {
      stopPolling();
      if (unbindRef.current) unbindRef.current();
      stopHeartbeat();
    };
  }, []);

  // Check for completion
  useEffect(() => {
    if (serverState && instance) {
      const allSolved = (serverState.states || []).every(s => s.state === 'correct');
      if (allSolved) {
        setShowCompletion(true);
      }
    }
  }, [serverState, instance]);

  function startPolling(sessionId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/sessions/${sessionId}`);
        if (r.ok) {
          const data = await r.json();
          setServerState(data);
        }
      } catch (e) {
        console.error('poll error', e);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function startGame(teamId) {
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const json = await res.json();
      if (!json.instanceId) throw new Error('Failed to create instance');

      const r2 = await fetch(`/api/instances/${json.instanceId}`);
      const payload = await r2.json();
      setInstance(payload);

      const r3 = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: json.instanceId, teamId }),
      });
      const s = await r3.json();
      if (s && s.sessionId) {
        const sessionObj = {
          sessionId: s.sessionId,
          token: s.token,
          instanceId: json.instanceId,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionObj));
        setSession(sessionObj);
        startPolling(s.sessionId);
        startHeartbeat(s.sessionId);
        unbindRef.current = bindAntiCheatHooks(s.sessionId);

        const st = await fetch(`/api/sessions/${s.sessionId}`).then((r) =>
          r.json()
        );
        setServerState(st);
      }
    } catch (err) {
      console.error('Failed to start game:', err);
      alert('Failed to start game. Please try again.');
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    if (unbindRef.current) {
      unbindRef.current();
      unbindRef.current = null;
    }
    stopHeartbeat();
    stopPolling();
    setSession(null);
    setInstance(null);
    setServerState(null);
    setAnswerInputs({});
    setShowCompletion(false);
  }

  async function submitAnswer(lockIndex) {
    if (!session) return alert('No session');
    const answer = answerInputs[lockIndex];
    try {
      const res = await fetch(
        `/api/sessions/${session.sessionId}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lock_index: lockIndex, answer }),
        }
      );
      const j = await res.json();
      if (!j.correct) {
        alert(`Incorrect. ${j.reason || 'Try again.'}`);
      }
      const st = await fetch(`/api/sessions/${session.sessionId}`).then((r) =>
        r.json()
      );
      setServerState(st);
    } catch (err) {
      alert('Error submitting answer');
      console.error(err);
    }
  }

  // Landing page
  if (!session) {
    return <LandingPage onStartGame={startGame} />;
  }

  // Game page
  return (
    <div className="app-container">
      <div className="container">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>🔓 Catch Me If You Can</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>Solve all locks to complete the challenge</p>
        </div>

        {showCompletion && serverState && (
          <CompletionScreen
            session={session}
            serverState={serverState}
            onNewGame={clearSession}
          />
        )}

        <div className="game-layout">
          <div className="game-main">
            {instance && serverState && (
              <>
                <div>
                  <h3 style={{ marginBottom: '16px' }}>Locks</h3>
                  <div className="locks-container">
                    {instance.locks.map((lock, idx) => {
                      const stateRow = (serverState.states || []).find(
                        (s) => s.lock_index === idx
                      ) || {};
                      return (
                        <LockCard
                          key={idx}
                          lock={lock}
                          index={idx}
                          state={stateRow}
                          answerInputs={answerInputs}
                          onAnswerChange={(i, val) =>
                            setAnswerInputs((a) => ({ ...a, [i]: val }))
                          }
                          onSubmit={submitAnswer}
                          onReset={(i) =>
                            setAnswerInputs((a) => ({ ...a, [i]: [] }))
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="game-sidebar">
            {serverState && (
              <>
                <ProgressStats serverState={serverState} />
                <SessionInfo
                  session={session}
                  serverState={serverState}
                  onClearSession={clearSession}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
