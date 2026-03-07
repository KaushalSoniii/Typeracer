const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ─── Word Prompts ────────────────────────────────────────────────────────────
const PROMPTS = [
  "the quick brown fox jumps over the lazy dog near the riverbank on a cold winter morning",
  "programming is the art of telling another human what one wants the computer to do with precision and clarity",
  "in the beginning was the word and the word was with code and the code was everything we needed",
  "the best way to predict the future is to invent it one keystroke at a time with passion",
  "simplicity is the ultimate sophistication and good code reads like well written prose on a sunny day",
  "any sufficiently advanced technology is indistinguishable from magic when seen through the eyes of wonder",
  "the only way to do great work is to love what you do and type fast while doing it",
  "not all those who wander are lost but all those who code are definitely caffeinated most of the time",
  "we build too many walls and not enough bridges but in code we can build both simultaneously",
  "the computer was born to solve problems that did not exist before it was invented by brilliant minds",
];

// ─── In-Memory State ─────────────────────────────────────────────────────────
const rooms = new Map();       // roomId -> Room
const leaderboard = [];        // [{name, wpm, accuracy, date}]
const MAX_LEADERBOARD = 50;

// ─── Room Structure ──────────────────────────────────────────────────────────
function createRoom(roomId, hostName) {
  return {
    id: roomId,
    host: null,
    players: new Map(),   // socketId -> Player
    status: "waiting",    // waiting | countdown | racing | finished
    prompt: "",
    startTime: null,
    countdownTimer: null,
    createdAt: Date.now(),
  };
}

function createPlayer(socketId, name) {
  return {
    id: socketId,
    name,
    progress: 0,       // chars typed correctly
    wpm: 0,
    accuracy: 100,
    finished: false,
    finishTime: null,
    finishRank: null,
    errors: 0,
    totalTyped: 0,
  };
}

function getRoomPublicState(room) {
  const players = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    progress: p.progress,
    wpm: p.wpm,
    accuracy: p.accuracy,
    finished: p.finished,
    finishRank: p.finishRank,
  }));
  return {
    id: room.id,
    status: room.status,
    prompt: room.prompt,
    players,
    host: room.host,
  };
}

function getLeaderboard() {
  return leaderboard
    .sort((a, b) => b.wpm - a.wpm)
    .slice(0, 20);
}

function addToLeaderboard(entry) {
  leaderboard.push({ ...entry, date: new Date().toISOString() });
  leaderboard.sort((a, b) => b.wpm - a.wpm);
  if (leaderboard.length > MAX_LEADERBOARD) leaderboard.splice(MAX_LEADERBOARD);
}

function startCountdown(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = "countdown";
  room.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  io.to(roomId).emit("countdown_start", { prompt: room.prompt });

  let count = 3;
  const tick = () => {
    if (!rooms.has(roomId)) return;
    if (count > 0) {
      io.to(roomId).emit("countdown_tick", { count });
      count--;
      room.countdownTimer = setTimeout(tick, 1000);
    } else {
      startRace(roomId);
    }
  };
  room.countdownTimer = setTimeout(tick, 1000);
}

function startRace(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = "racing";
  room.startTime = Date.now();
  io.to(roomId).emit("race_start", { startTime: room.startTime });
}

function checkAllFinished(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const allDone = Array.from(room.players.values()).every((p) => p.finished);
  if (allDone) endRace(roomId);
}

function endRace(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status === "finished") return;
  room.status = "finished";

  const results = Array.from(room.players.values())
    .sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      wpm: p.wpm,
      accuracy: p.accuracy,
      rank: p.finishRank || i + 1,
      finished: p.finished,
    }));

  // Add top result to leaderboard
  results.filter(r => r.finished).forEach(r => {
    addToLeaderboard({ name: r.name, wpm: r.wpm, accuracy: r.accuracy });
  });

  io.to(roomId).emit("race_finished", {
    results,
    leaderboard: getLeaderboard(),
  });

  // Auto-cleanup room after 60s
  setTimeout(() => {
    rooms.delete(roomId);
  }, 60000);
}

// ─── Socket.io Logic ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Create a new room
  socket.on("create_room", ({ playerName }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const room = createRoom(roomId, playerName);
    const player = createPlayer(socket.id, playerName || "Anonymous");

    room.host = socket.id;
    room.players.set(socket.id, player);
    rooms.set(roomId, room);

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;

    socket.emit("room_created", { roomId, state: getRoomPublicState(room) });
    console.log(`[Room] Created: ${roomId} by ${playerName}`);
  });

  // Join existing room
  socket.on("join_room", ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found." });
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("error", { message: "Race already in progress." });
      return;
    }
    if (room.players.size >= 6) {
      socket.emit("error", { message: "Room is full (max 6 players)." });
      return;
    }

    const player = createPlayer(socket.id, playerName || "Anonymous");
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;

    io.to(roomId).emit("player_joined", { state: getRoomPublicState(room) });
    console.log(`[Room] ${playerName} joined ${roomId}`);
  });

  // Host starts the race
  socket.on("start_race", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can start the race." });
      return;
    }
    if (room.players.size < 1) {
      socket.emit("error", { message: "Need at least 1 player." });
      return;
    }
    startCountdown(roomId);
  });

  // Player typing progress update
  socket.on("typing_progress", ({ progress, wpm, accuracy, errors, totalTyped }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.status !== "racing") return;

    const player = room.players.get(socket.id);
    if (!player || player.finished) return;

    player.progress = progress;
    player.wpm = wpm;
    player.accuracy = accuracy;
    player.errors = errors;
    player.totalTyped = totalTyped;

    // Check if player finished
    if (progress >= room.prompt.length) {
      player.finished = true;
      player.finishTime = Date.now();
      const finishedCount = Array.from(room.players.values()).filter(p => p.finished).length;
      player.finishRank = finishedCount;

      socket.emit("player_finished", {
        rank: player.finishRank,
        wpm: player.wpm,
        accuracy: player.accuracy,
      });

      checkAllFinished(roomId);
    }

    // Broadcast progress to all in room
    io.to(roomId).emit("progress_update", {
      playerId: socket.id,
      progress: player.progress,
      wpm: player.wpm,
      accuracy: player.accuracy,
      finished: player.finished,
      finishRank: player.finishRank,
    });
  });

  // Get leaderboard
  socket.on("get_leaderboard", () => {
    socket.emit("leaderboard_data", { leaderboard: getLeaderboard() });
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.players.delete(socket.id);
    console.log(`[-] Disconnected: ${socket.id} from room ${roomId}`);

    if (room.players.size === 0) {
      if (room.countdownTimer) clearTimeout(room.countdownTimer);
      rooms.delete(roomId);
      console.log(`[Room] Deleted empty room: ${roomId}`);
    } else {
      // Transfer host if needed
      if (room.host === socket.id) {
        room.host = room.players.keys().next().value;
        io.to(roomId).emit("host_changed", { newHost: room.host });
      }
      io.to(roomId).emit("player_left", { state: getRoomPublicState(room) });
    }
  });
});

// ─── REST Endpoints ───────────────────────────────────────────────────────────
app.get("/api/leaderboard", (req, res) => {
  res.json({ leaderboard: getLeaderboard() });
});

app.get("/api/rooms", (req, res) => {
  const activeRooms = Array.from(rooms.values())
    .filter(r => r.status === "waiting")
    .map(r => ({
      id: r.id,
      playerCount: r.players.size,
      createdAt: r.createdAt,
    }));
  res.json({ rooms: activeRooms });
});

app.get("/health", (req, res) => res.json({ status: "ok", rooms: rooms.size }));

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
