# 🏎 TypeRacer Clone — Multiplayer Typing Game

A real-time multiplayer typing race game built with **React + Node.js + Socket.io**.

---

## 🗂 Project Structure

```
typeracer-clone/
├── backend/
│   ├── server.js          ← Express + Socket.io server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        ← Full React app (all screens)
│   │   ├── main.jsx       ← Entry point
│   │   └── index.css      ← Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Install dependencies

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev       # or: npm start
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 2. Open the app
Visit → **http://localhost:5173**

---

## 🎮 How to Play

1. Enter your name on the home screen
2. **Create a room** — share the 6-character room code with friends
3. Friends enter the code and click **Join Room**
4. Host clicks **Start Race**
5. A 3-second countdown begins, then type the prompt as fast and accurately as possible!
6. See live progress bars for all racers
7. Results + leaderboard shown at the end

---

## 🌐 Features

| Feature | Details |
|---|---|
| **Real-time multiplayer** | Socket.io WebSockets, up to 6 players per room |
| **Live progress bars** | See all opponents racing with WPM live |
| **WPM + Accuracy** | Calculated in real time |
| **Global Leaderboard** | Top 20 all-time scores (in-memory) |
| **Countdown** | 3-2-1-GO! synchronized across all players |
| **Room codes** | 6-character shareable room codes |
| **Auto host transfer** | If host disconnects, next player becomes host |

---

## 🚀 Deploy to Production

### Backend → Railway / Render / Fly.io

1. Push `backend/` to a GitHub repo
2. Connect to [Railway](https://railway.app) or [Render](https://render.com)
3. Set start command: `node server.js`
4. Note your deployed backend URL (e.g. `https://typeracer-backend.railway.app`)

### Frontend → Vercel / Netlify

1. In `frontend/`, create a `.env` file:
   ```
   VITE_SERVER_URL=https://your-backend-url.railway.app
   ```
2. Push `frontend/` to GitHub
3. Connect to [Vercel](https://vercel.com) — it auto-detects Vite
4. Done! Share your URL

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, Socket.io-client
- **Backend:** Node.js, Express, Socket.io v4
- **Styling:** Pure CSS-in-JS (no extra deps)
- **Real-time:** WebSockets via Socket.io

---

## 🔌 Socket.io Events Reference

| Event | Direction | Description |
|---|---|---|
| `create_room` | client → server | Create a new room |
| `join_room` | client → server | Join existing room |
| `start_race` | client → server | Host starts countdown |
| `typing_progress` | client → server | Send typing progress update |
| `get_leaderboard` | client → server | Request leaderboard data |
| `room_created` | server → client | Room created confirmation |
| `player_joined` | server → room | New player joined |
| `countdown_tick` | server → room | 3, 2, 1 countdown |
| `race_start` | server → room | Race begins (with timestamp) |
| `progress_update` | server → room | A player's progress changed |
| `race_finished` | server → room | All done — show results |
| `leaderboard_data` | server → client | Leaderboard payload |

---
