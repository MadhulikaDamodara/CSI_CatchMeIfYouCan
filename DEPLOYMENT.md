# 🚀 Deployment & Event Day Guide

**For TECSTASY 2026 Event Organizers**

---

## 📋 Pre-Event Checklist (1 Week Before)

- [ ] Clone the repository
- [ ] Test locally on your machine
- [ ] Set up event-specific admin secret
- [ ] Brief judges on cheating indicators
- [ ] Test Docker installation on event machines
- [ ] Prepare backup database
- [ ] Create judge instruction cards with secret
- [ ] Test projector setup with admin dashboard
- [ ] Backup all source code

---

## 🏗️ System Requirements

**Server (Recommended):**
- Ubuntu 18+ or Debian 10+
- 4GB RAM (for concurrent teams)
- 20GB disk space
- Internet connection (for GitHub clone)

**Networking:**
- All teams on same LAN
- Router configured to allow broadcast
- Firewall allows ports 5173 (frontend)

**Software:**
- Docker 20.10+
- Docker Compose 1.29+
- Git (for cloning)

---

## 🔧 Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/MadhulikaDamodara/CSI_CatchMeIfYouCan.git
cd CSI_CatchMeIfYouCan
```

### Step 2: Configure Environment
```bash
# Create .env file with event-specific settings
cat > .env << EOF
PORT=3000
DATABASE_URL=postgres://postgres:postgres@db:5432/csi
SESSION_SECRET=change_me_for_production
ADMIN_SECRET=your_judge_secret_here_12345
NODE_ENV=production
EOF
```

### Step 3: Start Services
```bash
docker-compose up -d
```

**Expected Output:**
```
✅ csi_catchmeifyoucan-db-1        Running
✅ csi_catchmeifyoucan-backend-1   Running  
✅ csi_catchmeifyoucan-frontend-1  Running
```

### Step 4: Verify Setup
```bash
# Check if frontend is accessible
curl -s http://localhost:5173 | grep "Catch Me If You Can" > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend Error"

# Check if backend API is responding
curl -s http://localhost:3000/api/instances -X POST \
  -H "Content-Type: application/json" \
  -d '{"teamId":"test"}' | grep instanceId > /dev/null && echo "✅ Backend OK" || echo "❌ Backend Error"

# Check database
docker-compose exec db psql -U postgres -d csi -c "SELECT COUNT(*) FROM sessions;" > /dev/null && echo "✅ Database OK" || echo "❌ Database Error"
```

---

## 🎮 Event Day Setup (30 minutes before start)

### Morning (Before Teams Arrive)

**1. Start Services**
```bash
cd /path/to/CSI_CatchMeIfYouCan
docker-compose up -d

# Verify all services are running
docker-compose ps
```

**2. Clear Old Data (Optional)**
```bash
# Backup old sessions
docker-compose exec db pg_dump -U postgres csi > backup_$(date +%Y%m%d_%H%M%S).sql

# Clear tables (CAUTION: This deletes all data)
docker-compose exec db psql -U postgres -d csi -c "TRUNCATE sessions, session_states, instances CASCADE;"
```

**3. Verify Network**
```bash
# Get server IP
hostname -I

# or on Mac
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**4. Set Up Monitoring Station**
```bash
# On laptop/tablet for judges, open:
# http://<SERVER_IP>:5173?secret=<ADMIN_SECRET>
```

**5. Brief Judges**
- Share the admin secret (verbal only!)
- Explain the dashboard interface
- Show focus loss counter interpretation
- Provide phone number for technical issues

---

## 🎯 During the Event

### Real-Time Monitoring (Judges' Role)

**Station Setup:**
```
┌─────────────────┐
│  Judge Laptop   │
│  Admin Dashboard│ (http://SERVER_IP:5173?secret=...)
└────────┬────────┘
         │
         │ WiFi
         │
┌────────┴────────┐
│   Event Server  │
│  Docker running │
└─────────────────┘
         │
         │ Ethernet
         │
┌────────┴────────┐
│   Team Laptops  │
│  Game Frontend  │ (http://SERVER_IP:5173)
└─────────────────┘
```

**Judge Instructions:**
1. Open admin dashboard: `http://localhost:5173?secret=YOUR_SECRET`
2. Watch the "Active Teams" section
3. Monitor "Focus Lost" count per team
4. Note any "Flagged" status
5. React to suspicious patterns:
   - Focus Loss > 5 → Contact team
   - Flagged = true → Immediate review
   - Rapid lock solving → Check timestamps

### Handling Issues

**Team Can't Connect**
```bash
# Check if server is running
docker-compose ps

# Check server IP
hostname -I

# Verify frontend is up
curl http://localhost:5173
```

**Team Reports Slow Game**
```bash
# Check backend logs
docker-compose logs backend | tail -20

# Check database performance
docker-compose exec db psql -U postgres -d csi -c "SELECT COUNT(*) FROM sessions;"
```

**Team Complains About Timer Disagreement**
```bash
# Show server's authoritative timer
curl http://localhost:3000/api/sessions/<SESSION_ID>?secret=<ADMIN_SECRET> | jq '.remaining_seconds'
```

**Suspected Cheating (Copy/Paste)**
```bash
# Check session logs for flagged status
curl "http://localhost:3000/api/admin/sessions/<SESSION_ID>?secret=<ADMIN_SECRET>" | jq '.session.flagged'

# View answer timeline
curl "http://localhost:3000/api/admin/sessions/<SESSION_ID>?secret=<ADMIN_SECRET>" | jq '.lock_states'
```

---

## 📊 Post-Event Analysis

### Immediately After Event

**Export All Data**
```bash
curl "http://localhost:3000/api/admin/export?secret=ADMIN_SECRET" > event_results_$(date +%Y%m%d_%H%M%S).json
```

**Export Database for Spreadsheet**
```bash
# Export sessions as CSV
docker-compose exec db psql -U postgres -d csi -c "
COPY sessions TO STDOUT WITH CSV HEADER;" > sessions.csv

# Export answers as CSV
docker-compose exec db psql -U postgres -d csi -c "
COPY session_states TO STDOUT WITH CSV HEADER;" > answers.csv
```

**View Results**
```bash
# Final leaderboard
curl "http://localhost:3000/api/admin/leaderboard?secret=ADMIN_SECRET" | jq '.leaderboard'
```

### Analysis with Python

```python
#!/usr/bin/env python3
import json
import pandas as pd
from datetime import datetime

# Load exported data
with open('event_results_*.json') as f:
    data = json.load(f)

# Create DataFrames
sessions = pd.DataFrame(data['sessions'])
states = pd.DataFrame(data['session_states'])

# Analysis: Final Leaderboard (completed sessions only)
completed = sessions[sessions['flagged'] == False].sort_values('created_at')
print("FINAL LEADERBOARD:")
print("=" * 80)
print(f"{'Rank':<5} {'Team':<25} {'Time':<10} {'Focus Loss':<12} {'Status':<10}")
print("-" * 80)

for idx, (_, row) in enumerate(completed.iterrows(), 1):
    time_taken = row['total_seconds'] - row['remaining_seconds']
    status = "✅" if not row['flagged'] else "🚩"
    print(f"{idx:<5} {row['team_id']:<25} {time_taken:<10} {row['focus_lost_count']:<12} {status:<10}")

# Analysis: Suspicious Teams
print("\n\nFLAGGED/SUSPICIOUS TEAMS:")
print("=" * 80)
flagged = sessions[sessions['flagged'] == True]
if len(flagged) == 0:
    print("None - Clean event!")
else:
    for _, row in flagged.iterrows():
        print(f"- {row['team_id']}: {row['focus_lost_count']} focus loss events")

# Export summary
summary = {
    'total_teams': len(sessions),
    'completed_teams': len(completed),
    'flagged_teams': len(flagged),
    'avg_focus_loss': float(sessions['focus_lost_count'].mean()),
    'event_date': datetime.now().isoformat()
}

with open('event_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f"\n\n✅ Results exported to event_summary.json")
```

### Cleanup After Event

```bash
# Stop all services
docker-compose down

# Keep data backed up
cp event_results_*.json ./backups/
cp sessions.csv ./backups/
cp answers.csv ./backups/

# Optionally, preserve Docker images for next event
docker images
```

---

## 🛡️ Security Best Practices

### Before Event
1. **Change default passwords:**
   ```bash
   # Update postgres password in .env
   POSTGRES_PASSWORD=strong_password_here
   ```

2. **Use strong admin secret:**
   ```bash
   # In .env
   ADMIN_SECRET=$(openssl rand -base64 32)
   ```

3. **Restrict network access:**
   ```bash
   # Only allow local network
   docker-compose up -d  # Only accessible on local network by default
   ```

### During Event
1. **Don't share admin secret publicly**
   - Only give to official judges
   - Verbal communication only
   - Change after event

2. **Monitor database access**
   ```bash
   docker-compose logs db | grep "ERROR"
   ```

3. **Backup data regularly**
   ```bash
   # Every 30 minutes during event
   docker-compose exec db pg_dump -U postgres csi > backup_$(date +%H%M).sql
   ```

### After Event
1. **Secure the backups**
2. **Change admin secret**
3. **Rotate database password**
4. **Archive logs**

---

## 🔧 Troubleshooting

### All Services Show "Exited"
```bash
# Check logs
docker-compose logs

# Restart
docker-compose down
docker-compose up -d
```

### Backend can't connect to database
```bash
# Verify postgres is running
docker-compose exec db psql -U postgres -c "\l"

# Check connection string in logs
docker-compose logs backend | grep "DATABASE_URL"

# Might need to wait 30 seconds for DB to initialize
sleep 30 && docker-compose restart backend
```

### Frontend shows "Cannot reach API"
```bash
# Check backend is listening
docker-compose exec backend lsof -i :3000

# Verify CORS enabled
# (it should be by default)
```

### Teams can't access frontend
```bash
# Check frontend is serving
curl http://localhost:5173

# Check on other machine  
curl http://<SERVER_IP>:5173

# If not accessible, may need to update Docker networking
# (usually works out of the box)
```

### Database is running slow
```bash
# Check active queries
docker-compose exec db psql -U postgres -d csi -c "SELECT * FROM pg_stat_statements LIMIT 10;"

# Restart database
docker-compose restart db
```

---

## 📞 Emergency Contacts

**If something goes wrong:**

1. **Team can't play?**
   - Check internet connection
   - Verify server IP
   - Restart team's browser cache

2. **Timer not syncing?**
   - Check backend logs for heartbeat errors
   - Restart the session

3. **Server is down?**
   - Run `docker-compose up -d` again
   - Check disk space: `df -h`

4. **Suspicious activity?**
   - Check admin dashboard immediately
   - Review focus loss count
   - Export session data for review

**Contact Info (Add your team's):**
- Technical Lead: [Your Name] [Phone]
- Judge Coordinator: [Name] [Phone]
- Backup Admin: [Name] [Phone]

---

## 📈 Success Metrics

**Good Signs:**
- ✅ All services running peacefully
- ✅ No significant focus loss across teams
- ✅ No flagged sessions
- ✅ Teams solving 3-5 locks on average
- ✅ Event completes on schedule

**Warning Signs:**
- ⚠️ Teams reporting timer disagreements
- ⚠️ Multiple teams with focus loss > 5
- ⚠️ Suspicious answer patterns
- ⚠️ Server responsiveness degrading

---

## 🎓 Judge Instructions Card (Print this)

```
╔════════════════════════════════════════════════════════════════╗
║         CATCH ME IF YOU CAN - JUDGE INSTRUCTIONS              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ 1. ADMIN DASHBOARD:                                            ║
║    URL: http://SERVER_IP:5173?secret=XXXXX                    ║
║    Refreshes every 5 seconds                                  ║
║                                                                ║
║ 2. WHAT TO WATCH:                                              ║
║    🟢 Green edges = Team is fine                              ║
║    🟡 Orange edges = Some focus loss (2-4 events)             ║
║    🔴 Red edges = HIGH SUSPICION (>5 focus loss or flagged)   ║
║                                                                ║
║ 3. FOCUS LOSS LEVELS:                                          ║
║    0-1: Normal (tab switching expected)                        ║
║    2-4: Caution (watch more closely)                           ║
║    5+:  Disqualification worthy                                ║
║                                                                ║
║ 4. If Team is Flagged (🚩):                                    ║
║    • Copy/paste was attempted                                 ║
║    • Right-click inspection attempted                         ║
║    • Immediate action recommended                             ║
║                                                                ║
║ 5. ESCALATION:                                                 ║
║    • Suspicious pattern? → Check focus loss count             ║
║    • Too many quick solves? → Check timestamps                ║
║    • Can't determine? → Pull server logs                      ║
║                                                                ║
║ Remember: Trust the logs. The system doesn't lie.             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

**Good luck with TECSTASY 2026! 🚀**

For technical support: [Your email/contact]
