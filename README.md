# 🔓 Catch Me If You Can – Tech Escape Hunt

**A fair, randomized escape-room game with server-authoritative anti-cheat for college tech events.**

---

## 📋 Overview

**Catch Me If You Can** is a competitive tech escape game designed for TECSTASY 2026 and similar hackathons/tech-fests. Each team receives a **unique, equal-difficulty puzzle instance** with 5 randomized locks. Gameplay is protected by **server-side anti-cheat**, ensuring fair competition.

### Key Vision
- **Fair Competition:** Per-team randomized instances prevent copying
- **Server-Authoritative:** Timers, anti-cheat, and validation enforced server-side  
- **Persistent & Trackable:** All sessions logged in PostgreSQL for analysis
- **Real-Time Feedback:** Live timer, progress tracking, and completion detection

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Browser                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ React Frontend (Vite)                         │  │
│  │ • Landing page & team signup                  │  │
│  │ • 5 interactive lock types                    │  │
│  │ • Real-time timer & progress                  │  │
│  │ • Client-side anti-cheat hooks                │  │
│  └────┬────────────────────────────────────┬─────┘  │
│       │ HTTPS/REST API                     │        │
└───────┼────────────────────────────────────┼────────┘
        │                                    │
        ▼                                    ▼
    ┌────────────────────────────────────────────────┐
    │      Node.js Backend (Express.js)              │
    │  ┌──────────────────────────────────────────┐  │
    │  │ • Puzzle generation engine               │  │
    │  │ • Session management & timers            │  │
    │  │ • Answer validation                      │  │
    │  │ • Anti-cheat monitoring                  │  │
    │  │ • Heartbeat & focus tracking             │  │
    │  └──────────────────┬───────────────────────┘  │
    └─────────────────────┼──────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │   PostgreSQL 15.0 (Persistent)      │
        │  ┌─────────────────────────────┐    │
        │  │ • instances (puzzle sets)   │    │
        │  │ • sessions (game state)     │    │
        │  │ • session_states (answers)  │    │
        │  └─────────────────────────────┘    │
        └─────────────────────────────────────┘
```

---

## 🎮 Game Flow

```
START
  │
  ├─→ Landing Page
  │   • Team enters name
  │   • Clicks "Start Challenge"
  │
  ├─→ Backend: generateInstance()
  │   • Creates unique puzzle set (5 locks)
  │   • Stores in PostgreSQL
  │   • Returns instance ID
  │
  ├─→ Frontend: Start Session
  │   • Creates game session
  │   • Binds anti-cheat hooks
  │   • Starts heartbeat monitor (10s)
  │   • Displays timer & locks
  │
  ├─→ Game Loop (3-second polling)
  │   • User solves locks (5 types)
  │   • Submit answer → Backend validates
  │   • Server tracks lock state
  │   • Updates progress in real-time
  │
  ├─→ Completion Check
  │   • All locks solved?
  │   • YES: Show completion modal with stats
  │   • NO: Continue game loop
  │
  ├─→ Session Cleanup
  │   • User clicks "New Challenge" or closes
  │   • Session marked complete
  │   • All data persisted in DB
  │
  END
```

---

## 🛡️ Anti-Cheat System

### Client-Side Monitoring
- **Focus Detection:** Tracks window blur/visibility changes
- **Copy/Paste Blocking:** Prevents clipboard abuse
- **Right-Click Prevention:** Disables context menu inspection
- **Navigation Blocking:** Prevents tab switching mid-game
- **Heartbeat System:** 10-second keep-alive pings to server

### Server-Side Validation
- **Focus Loss Count:** Server increments on each reported loss
- **Flagging System:** Suspicious behavior marked in database
- **Session Integrity:** Validates answers against expected hashes
- **Persistent Logging:** All events recorded for post-game analysis

### Result
✅ **Fair, verifiable competition** — judges can see which teams lost focus or attempted cheating.

---

## 🎯 Lock Types

| Type | Challenge | Time | Difficulty |
|------|-----------|------|------------|
| **Logic** | Math/reasoning puzzles | 120s | 1 |
| **Code** | Debug or analyze code | 90s | 1 |
| **Cipher** | Decrypt with hints | 60s | 1 |
| **Block** | Sequence blocks correctly | 150s | 1 |
| **MCQ** | Multiple-choice questions | 60s | 1 |

*All randomized per team. Each lock has random parameters ensuring unique, equal-difficulty instances.*

---

## 🚀 Quick Start (Docker)

### 1. Clone & Navigate
```bash
git clone https://github.com/MadhulikaDamodara/CSI_CatchMeIfYouCan.git
cd CSI_CatchMeIfYouCan
```

### 2. Start All Services
```bash
docker-compose up -d
```

**Services Started:**
- PostgreSQL 15: `localhost:5432`
- Node.js API: `localhost:3000`
- React Frontend: `localhost:5173`

### 3. Access the Game
Open in browser: **http://localhost:5173**

### 4. View Logs
```bash
docker-compose logs -f
```

### 5. Stop Services
```bash
docker-compose down
```

---

## 📡 API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/instances` | POST | Create new instance (body: `{teamId}`) |
| `/api/instances/:id` | GET | Fetch puzzle payload |
| `/api/sessions` | POST | Create game session |
| `/api/sessions/:id` | GET | Get current session state |
| `/api/sessions/:id/heartbeat` | POST | Keep-alive ping |
| `/api/sessions/:id/focus` | POST | Report focus loss event |
| `/api/sessions/:id/answer` | POST | Submit lock answer |

---

## 📁 Project Structure

```
CSI_CatchMeIfYouCan/
├── backend/
│   ├── src/
│   │   ├── index.js           (Express server)
│   │   ├── routes.js          (API endpoints)
│   │   ├── generator.js       (Puzzle engine)
│   │   ├── sessions.js        (Game logic)
│   │   ├── antiCheat.js       (Cheat detection)
│   │   └── db.js              (PostgreSQL client)
│   ├── tools/
│   │   ├── test_generator.js
│   │   └── test_sessions.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            (Main React component)
│   │   ├── index.css          (Professional styling)
│   │   ├── anticheat.js       (Client monitoring)
│   │   └── main.jsx
│   ├── vite.config.js
│   └── Dockerfile
│
├── sql/
│   └── init.sql               (PostgreSQL schema)
│
├── docker-compose.yml
└── README.md
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18.2, Vite 5.0, CSS3 (Responsive) |
| **Backend** | Node.js, Express.js 4.18 |
| **Database** | PostgreSQL 15.0 |
| **Infrastructure** | Docker, Docker Compose, Nginx |
| **Deployment** | Containerized micro-services |

---

## 🎨 Design & Theme

**TECSTASY 2026 Integration: "CACHE ME IF YOU CAN"**

The UI features a **cyberpunk/neon aesthetic** aligned with the tech-fest:
- Dark base (navy/deep purple) with neon accents (cyan, magenta)
- Glowing, futuristic typography
- Smooth animations & transitions
- Fully responsive (laptop, tablet, mobile)
- High-contrast for projector demos

**Design Philosophy:** Functionality first, theme-enhanced. The UI looks cutting-edge without distracting from fair gameplay.

---

## 📊 Database Schema

### `instances`
```sql
id (UUID)           →  Unique puzzle instance
team_id (TEXT)      →  Team identifier
payload (JSONB)     →  Complete puzzle set (5 locks)
difficulty (INT)    →  Overall difficulty score
created_at (TS)     →  Timestamp
```

### `sessions`
```sql
id (UUID)                →  Session identifier
instance_id (FK)         →  Link to puzzle instance
team_id (TEXT)           →  Team identifier
total_seconds (INT)      →  Total time allowed
remaining_seconds (INT)  →  Time left
focus_lost_count (INT)   →  # of focus loss events
flagged (BOOL)          →  Cheat flag
created_at (TS)         →  Start timestamp
```

### `session_states`
```sql
session_id (FK)    →  Session reference
lock_index (INT)   →  Which lock (0-4)
state (TEXT)       →  "locked" | "correct" | "incorrect"
answer (JSONB)     →  User's submitted answer
updated_at (TS)    →  Last update timestamp
```

---

## 🧪 How to Play

1. **Enter Team Name**
   - Land on the bright, futuristic landing page
   - Type your team name or use the generated one
   - Click "Start Challenge"

2. **Solve 5 Locks**
   - **Logic Puzzle:** Answer a math question
   - **Code Challenge:** Identify output or error
   - **Cipher:** Decrypt a Caesar cipher
   - **Block Sequence:** Arrange blocks in order
   - **Multiple Choice:** Pick the correct option

3. **Watch the Timer**
   - Real-time countdown on the right sidebar
   - Timer pulses red when time is running out (<1 min)
   - Server enforces time limits

4. **Submit Answers**
   - Click "Submit Answer" for each lock
   - Get instant feedback
   - Progress bar updates in real-time

5. **Achieve Victory**
   - Solve all 5 locks to see the completion screen
   - View your stats:
     - Total time taken
     - Number of locks solved
     - Focus loss events
     - Anti-cheat status (✓ or 🚩)

---

## 📈 Metrics & Scoring

**Per-Team Tracked:**
- ⏱️ Time taken
- 🔓 Locks solved (0-5)
- 👁️ Focus loss count
- 🚩 Cheat flags triggered

**Post-Event:**
Judges can analyze database records to rank teams fairly and identify gameplay anomalies.

---

## 🚀 Deployment

### Development
```bash
docker-compose up -d
docker-compose logs -f
```

### Production
```bash
docker build -t csi-backend ./backend
docker build -t csi-frontend ./frontend
docker-compose up -d
```

---

## 📋 30-Second Judge Pitch

> "Catch Me If You Can is a server-authoritative tech escape game with randomized, equal-difficulty puzzles to prevent copying. Each team gets a unique instance, timers are enforced server-side, and all gameplay is logged in PostgreSQL. Built-in anti-cheat monitors focus loss, copy/paste attempts, and suspicious behavior. The frontend is a cyberpunk-themed React app, the backend is Express.js with client/server validation, and everything runs in Docker. This ensures fair, verifiable competition at tech-fests."

---

## 🔮 Future Enhancements

- [ ] Admin dashboard (/admin route for judges to view live sessions)
- [ ] Multi-player team mode
- [ ] Progressive difficulty levels
- [ ] Global leaderboard
- [ ] Hint system
- [ ] Replay & review system
- [ ] User authentication
- [ ] Mobile app version

---

## 📜 License

MIT License

---

**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Event:** TECSTASY 2026 - "CACHE ME IF YOU CAN"
