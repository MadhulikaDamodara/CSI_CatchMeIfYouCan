# 👨‍⚖️ Admin & Judge Dashboard Guide

---

## 📊 Judge/Admin View

The "Catch Me If You Can" system includes a comprehensive admin dashboard for judges and event organizers to monitor the competition in real-time.

### Access the Admin Dashboard

**Protected Route:** `http://localhost:5173/admin?secret=tecstasy2026`

**Authentication:**
- Query parameter: `?secret=tecstasy2026`
- OR header: `X-Admin-Secret: tecstasy2026`
- Change the secret in `.env` for production

---

## 🎮 Admin Dashboard Features

### 1. **Live Sessions View**
Real-time display of all active teams:
- **Team ID**: Which team is playing
- **Time Left**: Countdown timer (seconds remaining)
- **Locks Solved**: How many of 5 locks completed
- **Focus Lost**: Count of focus loss events
- **Flagged**: Anti-cheat flag status (✓ or 🚩)
- **Started**: Session start time

**Color Coding:**
- 🟢 Green border = Normal gameplay
- 🔴 Red border = Flagged for cheating

### 2. **Quick Stats**
High-level metrics:
- **Total Teams**: Number of active sessions
- **Avg Focus Loss**: Average focus loss count across all teams
- **Flagged Teams**: Count of flagged/suspicious sessions

### 3. **Real-Time Events**
Monitor gameplay as it happens:
- Watch teams solve locks in real time
- See focus loss events as they occur
- Instant notification if anti-cheat is triggered

---

## 📡 Admin API Endpoints

All endpoints require `?secret=tecstasy2026` or header authentication.

### 1. **GET /api/admin/sessions**
**Purpose:** List all active sessions with summary stats

**Response:**
```json
{
  "total_sessions": 15,
  "sessions": [
    {
      "id": "session-uuid-123",
      "team_id": "team_ninja_coders",
      "total_seconds": 600,
      "remaining_seconds": 245,
      "focus_lost_count": 2,
      "flagged": false,
      "created_at": "2026-02-07T18:30:00Z",
      "locks_solved": 3
    },
    ...
  ],
  "timestamp": "2026-02-07T18:35:00Z"
}
```

### 2. **GET /api/admin/sessions/:id**
**Purpose:** Get detailed info for a specific session

**Response:**
```json
{
  "session": {
    "id": "session-uuid-123",
    "instance_id": "instance-uuid-456",
    "team_id": "team_ninja_coders",
    "total_seconds": 600,
    "remaining_seconds": 245,
    "focus_lost_count": 2,
    "flagged": false,
    "created_at": "2026-02-07T18:30:00Z"
  },
  "lock_states": [
    {
      "lock_index": 0,
      "state": "correct",
      "answer": "42",
      "updated_at": "2026-02-07T18:31:15Z"
    },
    {
      "lock_index": 1,
      "state": "incorrect",
      "answer": "wrong_answer",
      "updated_at": "2026-02-07T18:32:00Z"
    },
    ...
  ],
  "timestamp": "2026-02-07T18:35:00Z"
}
```

### 3. **GET /api/admin/leaderboard**
**Purpose:** Real-time leaderboard ranked by completion time

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "team_id": "team_ninja_coders",
      "completion_time": 215,
      "attempts": 1,
      "avg_focus_loss": "0.00",
      "flagged_count": 0
    },
    {
      "rank": 2,
      "team_id": "team_code_masters",
      "completion_time": 342,
      "attempts": 2,
      "avg_focus_loss": "1.00",
      "flagged_count": 0
    },
    ...
  ],
  "timestamp": "2026-02-07T18:35:00Z"
}
```

### 4. **GET /api/admin/stats**
**Purpose:** Overall event statistics

**Response:**
```json
{
  "total_sessions": 42,
  "active_sessions": 12,
  "completed_sessions": 30,
  "avg_focus_loss": "1.23",
  "flagged_sessions": 2,
  "timestamp": "2026-02-07T18:35:00Z"
}
```

### 5. **GET /api/admin/export**
**Purpose:** Export all data for post-event analysis

**Response:**
```json
{
  "export_date": "2026-02-07T18:35:00Z",
  "sessions": [...],
  "session_states": [...],
  "metadata": {
    "total_sessions": 42,
    "total_answers": 210
  }
}
```

### 6. **POST /api/admin/flag-session/:id**
**Purpose:** Manually flag a session for cheating (for judges)

**Body:**
```json
{
  "reason": "Observed leaving the exam and returning"
}
```

**Response:**
```json
{
  "success": true,
  "session": {...}
}
```

---

## 🎯 Using the Admin Dashboard During the Event

### Pre-Event Setup
```bash
# Export the admin secret to environment
export ADMIN_SECRET="your_secret_key_here"

# Start the application
docker-compose up -d
```

### During Event

**1. Monitor Active Teams**
```bash
curl "http://localhost:3000/api/admin/sessions?secret=tecstasy2026" | jq '.'
```

**2. Check Specific Team Progress**
```bash
curl "http://localhost:3000/api/admin/sessions/SESSION_ID?secret=tecstasy2026" | jq '.lock_states'
```

**3. View Live Leaderboard**
```bash
curl "http://localhost:3000/api/admin/leaderboard?secret=tecstasy2026" | jq '.leaderboard'
```

**4. Monitor Event Stats**
```bash
curl "http://localhost:3000/api/admin/stats?secret=tecstasy2026" | jq '.'
```

### Handling Cheating Accusations

If a judge suspects cheating:

**1. Check the session logs:**
```bash
curl "http://localhost:3000/api/admin/sessions/SESSION_ID?secret=tecstasy2026" | jq '.'
```

**2. Review focus_lost_count:**
- 0-1: Minimal focus loss (normal)
- 2-5: Noticeable (possible tab switching)
- 5+: Highly suspicious

**3. Check flagged status:**
- `flagged: false` = Clean gameplay
- `flagged: true` = Anti-cheat triggered (copy/paste/right-click)

**4. Flag the session manually if needed:**
```bash
curl -X POST "http://localhost:3000/api/admin/flag-session/SESSION_ID?secret=tecstasy2026" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Observed suspicious behavior"}'
```

---

## 📊 Post-Event Analysis

### Export All Data
```bash
curl "http://localhost:3000/api/admin/export?secret=tecstasy2026" > event_data.json
```

### Analyze with Python
```python
import json
import pandas as pd

# Load data
with open('event_data.json') as f:
    data = json.load(f)

# Create DataFrames
sessions_df = pd.DataFrame(data['sessions'])
states_df = pd.DataFrame(data['session_states'])

# Final leaderboard (only completed sessions)
completed = sessions_df[sessions_df['flagged'] == False].sort_values('created_at')
print(completed[['team_id', 'total_seconds', 'focus_lost_count']])

# Flagged sessions (potential cheaters)
flagged = sessions_df[sessions_df['flagged'] == True]
print("Flagged sessions:", len(flagged))
```

---

## 🔍 Anti-Cheat Interpretation

### Focus Loss Count
- **Server-side tracked:** Each time browser loses focus, count increments
- **Normal range:** 0-2 (acceptable)
- **Suspicious range:** 3-5 (warn team)
- **Disqualify range:** 5+ (strong evidence of tab switching)

### Copy/Paste Detection
- **Frontend blocks:** All copy/paste attempts blocked
- **Server records:** Focus loss event logged
- **Evidence:** `flagged: true` in database

### Right-Click Prevention
- **Frontend blocks:** Disables context menu
- **Server records:** Focus loss event + flag
- **User sees:** "Context menu blocked" message

### Heartbeat Monitoring
- **Interval:** Server pings client every 10 seconds
- **Missing heartbeat:** Indicates disconnect/freeze
- **Timeout:** Session marked inactive if no ping for 30s

---

## 🎓 Judge Decision Matrix

### Green Light (No Action)
- ✅ focus_lost_count = 0-1
- ✅ flagged = false
- ✅ Regular solve pattern
- ✅ Reasonable time per lock

### Yellow Flag (Warn)
- ⚠️ focus_lost_count = 2-4
- ⚠️ Suspicious time gaps
- ⚠️ Wrong answers followed by correct
- **Action:** Note in report, monitor next session

### Red Flag (Investigate)
- ❌ focus_lost_count > 5
- ❌ flagged = true
- ❌ Copy/paste detected
- ❌ Multiple sessions under same team
- **Action:** Interview team, review timestamps, may disqualify

---

## 🔐 Security Best Practices

### For Event Day
1. **Change the admin secret:** Update `.env` before event
   ```bash
   ADMIN_SECRET="unique_secret_only_judges_know"
   ```

2. **Use HTTPS:** Put Nginx behind SSL/TLS in production
   ```nginx
   listen 443 ssl http2;
   ssl_certificate /etc/ssl/certs/your_cert.crt;
   ```

3. **Restrict access:** Only give secret to official judges
   - Don't share in public channels
   - Verbal communication only

4. **Log admin access:** Enable backend access logs
   ```bash
   docker-compose logs backend | grep "admin"
   ```

### For Database
1. **Restrict direct access:** Don't give judges direct DB access
2. **Use read-only API:** Admin endpoints are read-only (except flag-session)
3. **Backup data:** Export before changes
4. **Audit trail:** All admin actions logged with timestamps

---

## 📋 Checklist for Event Organizers

- [ ] Test admin dashboard before event
- [ ] Confirm all judges have the admin secret
- [ ] Brief judges on cheating indicators
- [ ] Set up real-time monitoring station (optional: projector)
- [ ] Export data after each round
- [ ] Have backup decision criteria ready
- [ ] Log all reported issues with timestamps
- [ ] Secure the MySQL/PostgreSQL password

---

## 🎯 Sample Pre-Event Briefing for Judges

*"Welcome, judges! Here's how to spot cheating:*

1. **Open the admin dashboard:** http://localhost:5173/admin?secret=...
2. **Watch the Focus Lost column:** If a team's count goes above 3, they're switching tabs
3. **Watch for Red Flags:** Any flagged team attempted copy/paste or right-click
4. **Check timestamps:** If they solve 4 locks in 10 seconds, that's suspicious
5. **In doubt, check the database:** Run `/api/admin/sessions/TEAM_ID` and review their answer timeline

**Remember:** The system logs everything. Trust the data."*

---

## 📞 Troubleshooting

### Admin endpoints returning 403
**Issue:** Invalid admin secret  
**Fix:** Check secret matches `ADMIN_SECRET` in `.env`

### No sessions showing
**Issue:** No teams have started yet  
**Fix:** Wait for teams to press "Start Challenge"

### Old sessions still showing
**Issue:** Sessions don't auto-expire  
**Fix:** Clear manually or check `remaining_seconds > 0` logic

### Data looks suspicious
**Issue:** Potential test data from setup  
**Fix:** Export data and filter by `created_at` timestamp

---

**Good luck adjudicating! Trust the logs. 🎯**
