import React, { useEffect, useState } from 'react'

function AdminDashboard({ secret }) {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const sessionsRes = await fetch(`/api/admin/sessions?secret=${secret}`);
      const statsRes = await fetch(`/api/admin/stats?secret=${secret}`);
      
      if (!sessionsRes.ok || !statsRes.ok) {
        throw new Error('Unauthorized: Invalid admin secret');
      }
      
      const sessionsData = await sessionsRes.json();
      const statsData = await statsRes.json();
      
      setSessions(sessionsData.sessions || []);
      setStats(statsData);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = autoRefresh ? setInterval(fetchData, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [autoRefresh, secret]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0e27', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '5px', color: '#00ff88' }}>🔐 Judge Dashboard</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>Real-time monitoring for TECSTASY 2026</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchData} 
            style={{ padding: '8px 16px', backgroundColor: '#00ff88', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 Refresh
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: 'rgba(0, 255, 136, 0.1)', padding: '8px 12px', borderRadius: '4px' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-Refresh
          </label>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ff0033', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '2px solid #ff0033' }}>
          ❌ Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#00ff88', fontSize: '1.1rem' }}>⏳ Loading sessions...</div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '30px' }}>
              <div style={{ border: '2px solid #00ff88', padding: '16px', borderRadius: '4px', backgroundColor: 'rgba(0, 255, 136, 0.05)', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Total Sessions</div>
                <div style={{ fontSize: '2rem', color: '#00ff88', fontWeight: 'bold' }}>{stats.total_sessions}</div>
              </div>
              <div style={{ border: '2px solid #ff6600', padding: '16px', borderRadius: '4px', backgroundColor: 'rgba(255, 102, 0, 0.05)', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Active Now</div>
                <div style={{ fontSize: '2rem', color: '#ff6600', fontWeight: 'bold' }}>{stats.active_sessions}</div>
              </div>
              <div style={{ border: '2px solid #00ccff', padding: '16px', borderRadius: '4px', backgroundColor: 'rgba(0, 204, 255, 0.05)', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Completed</div>
                <div style={{ fontSize: '2rem', color: '#00ccff', fontWeight: 'bold' }}>{stats.completed_sessions}</div>
              </div>
              <div style={{ border: '2px solid #ff0033', padding: '16px', borderRadius: '4px', backgroundColor: 'rgba(255, 0, 51, 0.05)', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Flagged</div>
                <div style={{ fontSize: '2rem', color: '#ff0033', fontWeight: 'bold' }}>{stats.flagged_sessions}</div>
              </div>
              <div style={{ border: '2px solid #ff9900', padding: '16px', borderRadius: '4px', backgroundColor: 'rgba(255, 153, 0, 0.05)', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Avg Focus Loss</div>
                <div style={{ fontSize: '2rem', color: '#ff9900', fontWeight: 'bold' }}>{stats.avg_focus_loss}</div>
              </div>
            </div>
          )}

          {/* Live Sessions */}
          <div>
            <h2 style={{ color: '#00ff88', fontSize: '1.2rem', marginBottom: '12px', marginTop: 0 }}>
              📊 Active Teams ({sessions.length})
            </h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No active sessions
                </div>
              ) : (
                sessions.map((session) => {
                  const suspiciousLevel = session.focus_lost_count > 5 ? 'critical' : session.focus_lost_count > 2 ? 'warning' : 'normal';
                  const borderColor = suspiciousLevel === 'critical' ? '#ff0033' : suspiciousLevel === 'warning' ? '#ff9900' : '#00ff88';
                  const bgColor = suspiciousLevel === 'critical' ? 'rgba(255, 0, 51, 0.1)' : suspiciousLevel === 'warning' ? 'rgba(255, 153, 0, 0.1)' : 'rgba(0, 255, 136, 0.05)';

                  return (
                    <div
                      key={session.id}
                      style={{
                        border: `2px solid ${borderColor}`,
                        padding: '12px',
                        borderRadius: '4px',
                        backgroundColor: bgColor,
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '0.9rem' }}>
                        <div>
                          <strong style={{ color: borderColor }}>👥 Team:</strong> {session.team_id}
                        </div>
                        <div>
                          <strong style={{ color: borderColor }}>⏱️ Time Left:</strong> {session.remaining_seconds}s
                        </div>
                        <div>
                          <strong style={{ color: borderColor }}>🔓 Locks:</strong> {session.locks_solved || 0}/5
                        </div>
                        <div>
                          <strong style={{ color: suspiciousLevel === 'critical' ? '#ff0033' : '#ff9900' }}>👁️ Focus Lost:</strong> {session.focus_lost_count}x
                        </div>
                        <div>
                          <strong style={{ color: session.flagged ? '#ff0033' : '#00ff88' }}>🚩 Flag:</strong> {session.flagged ? 'FLAGGED' : 'Clean'}
                        </div>
                        <div>
                          <strong style={{ color: borderColor }}>⏰ Started:</strong> {new Date(session.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div style={{ marginTop: '40px', padding: '15px', backgroundColor: 'rgba(0, 255, 136, 0.1)', borderLeft: '3px solid #00ff88', borderRadius: '4px', fontSize: '0.9rem', color: '#ddd' }}>
            <strong>📌 Guide:</strong>
            <ul style={{ marginTop: '10px', marginBottom: 0 }}>
              <li>🟢 Green border = Normal gameplay</li>
              <li>🟡 Orange border = Moderate focus loss (caution)</li>
              <li>🔴 Red border = High suspicion (focus loss {'>'} 5, or flagged)</li>
              <li>📊 Export data: <code style={{ backgroundColor: '#000', padding: '2px 6px', borderRadius: '3px' }}>/api/admin/export?secret=...</code></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
