const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const ALLOWED_ORIGINS = [
  "https://typeracer-omega.vercel.app",
  "http://localhost:5173",
];

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["GET", "POST"], credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"], credentials: true },
  transports: ["polling", "websocket"],
});

// ─── Prompts ──────────────────────────────────────────────────────────────────
const PROMPTS = [
  // ── Tech & Programming ────────────────────────────────────────────────────
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
  "a good programmer looks both ways before crossing a one way street because bugs hide in the shadows",
  "debugging is twice as hard as writing the code in the first place so write it as simply as you can",
  "software is like entropy it is difficult to grasp weightless and obeys the laws of its own universe",
  "the art of coding is not just writing instructions but crafting solutions that stand the test of time",
  "every line of code is a decision and every decision shapes the world that runs on machines we built",
  "clean code always looks like it was written by someone who cared about the people reading it later",
  "first make it work then make it right and finally if you need to make it fast but always in that order",
  "the function of good software is to make the complex appear simple and the impossible feel routine",

  // ── Philosophy & Wisdom ───────────────────────────────────────────────────
  "we are what we repeatedly do therefore excellence is not an act but a habit we build every single day",
  "the measure of intelligence is the ability to change your mind when new evidence arrives at your door",
  "it is not the mountain we conquer but ourselves and the limits we thought were permanent but were not",
  "do not go where the path may lead instead go where there is no path and leave a trail for others",
  "the secret of getting ahead is getting started one small step forward is better than standing perfectly still",
  "life is what happens when you are busy making other plans so slow down and notice what is around you",
  "an unexamined life is not worth living but an unlived life is not worth examining either so do both",
  "the only true wisdom is in knowing you know nothing and then spending your whole life trying to learn more",
  "darkness cannot drive out darkness only light can do that and hate cannot drive out hate only love can",
  "in three words i can sum up everything i have learned about life it goes on no matter what",

  // ── Science & Discovery ───────────────────────────────────────────────────
  "the universe is under no obligation to make sense to you but it rewards those who keep asking questions",
  "science is a way of thinking much more than it is a body of knowledge accumulated over centuries of wonder",
  "somewhere something incredible is waiting to be known and it is waiting for the curious mind to find it",
  "the good thing about science is that it is true whether or not you believe in it and that is beautiful",
  "we are all made of star stuff the nitrogen in our genes the calcium in our teeth all formed in stars",
  "two things are infinite the universe and human stupidity and i am not sure about the universe yet",
  "the important thing is to not stop questioning curiosity has its own reason for existing in us always",
  "look up at the stars and not down at your feet try to make sense of what you see and wonder about it",

  // ── Motivation & Success ──────────────────────────────────────────────────
  "success is not final failure is not fatal it is the courage to continue that counts above all else",
  "the harder you work for something the greater you will feel when you finally achieve it after all that effort",
  "do not watch the clock do what it does and keep going forward even when the progress feels invisible",
  "a winner is just a loser who tried one more time and refused to accept that this was the final answer",
  "you do not have to be great to start but you have to start if you ever want to become truly great",
  "the difference between ordinary and extraordinary is just that little extra you put in every single day",
  "push yourself because no one else is going to do it for you and the results will speak for themselves",
  "your limitation is only your imagination and the willingness to work past the point where others stop",

  // ── Nature & The World ────────────────────────────────────────────────────
  "the earth does not belong to us we belong to the earth and everything we do echoes through its future",
  "in every walk with nature one receives far more than one seeks the trees give back what words cannot",
  "look deep into nature and then you will understand everything better than any book could ever teach you",
  "the ocean stirs the heart inspires the imagination and brings eternal joy to the soul of those who listen",
  "there is something infinitely healing in the repeated refrains of nature the assurance that dawn comes again",
  "adopt the pace of nature her secret is patience and she never hurries yet everything gets accomplished",

  // ── Creativity & Art ──────────────────────────────────────────────────────
  "creativity is intelligence having fun and the two together can change the world in ways we cannot predict",
  "every artist dips the brush in their own soul and paints their own nature into every picture they create",
  "the purpose of art is washing the dust of daily life off your soul and reminding you of what matters most",
  "you can not use up creativity the more you use the more you have and the better you get at sharing it",
  "imagination is more important than knowledge knowledge is limited but imagination encircles the entire world",
  "art enables us to find ourselves and lose ourselves at the same time which is the rarest kind of freedom",

  // ── Typing & Speed ────────────────────────────────────────────────────────
  "speed comes from practice and practice comes from discipline the fingers learn what the mind commits to",
  "a typist is a musician playing the keyboard of language and every keystroke is a note in the composition",
  "the fastest fingers in the race are the ones that have made the most mistakes and kept going anyway",
  "rhythm is everything in typing find the flow and the words will pour out faster than you ever thought possible",
  "accuracy beats speed every time but when you have both there is no one who can compete with you today",
  "the keyboard is an extension of the mind and the words that flow through it reveal the speed of thought",
];
// ─── State ────────────────────────────────────────────────────────────────────
const rooms = new Map();
const leaderboardRaw = [];

function getLeaderboard() {
  const best = new Map();
  for (const e of leaderboardRaw) {
    const key = e.name.toLowerCase();
    if (!best.has(key) || e.wpm > best.get(key).wpm) best.set(key, e);
  }
  return Array.from(best.values()).sort((a, b) => b.wpm - a.wpm).slice(0, 5);
}

function addToLeaderboard(entry) {
  leaderboardRaw.push({ ...entry, date: new Date().toISOString() });
}

function createRoom(roomId) {
  return {
    id: roomId, host: null,
    players: new Map(),
    status: "waiting",
    prompt: "", startTime: null,
    countdownTimer: null, endTimer: null,
    createdAt: Date.now(),
  };
}

function createPlayer(socketId, name) {
  return {
    id: socketId, name,
    progress: 0, wpm: 0, accuracy: 100,
    finished: false, finishTime: null, finishRank: null,
    errors: 0, totalTyped: 0,
  };
}

function resetPlayer(p) {
  p.progress = 0; p.wpm = 0; p.accuracy = 100;
  p.finished = false; p.finishTime = null; p.finishRank = null;
  p.errors = 0; p.totalTyped = 0;
}

function getRoomState(room) {
  return {
    id: room.id,
    status: room.status,
    prompt: room.prompt,
    host: room.host,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id, name: p.name,
      progress: p.progress, wpm: p.wpm, accuracy: p.accuracy,
      finished: p.finished, finishRank: p.finishRank,
    })),
  };
}

// ─── Race Logic ───────────────────────────────────────────────────────────────
function startCountdown(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.status = "countdown";
  room.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

  // Send countdown_start to everyone with the prompt text
  io.to(roomId).emit("countdown_start", { prompt: room.prompt });

  let count = 3;
  const tick = () => {
    if (!rooms.has(roomId)) return;
    if (count > 0) {
      io.to(roomId).emit("countdown_tick", { count });
      count--;
      room.countdownTimer = setTimeout(tick, 1000);
    } else {
      room.status = "racing";
      room.startTime = Date.now();
      io.to(roomId).emit("race_start", { startTime: room.startTime });
    }
  };
  // First tick after 1s
  room.countdownTimer = setTimeout(tick, 1000);
}

function onPlayerFinished(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== "racing") return;
  const players = Array.from(room.players.values());
  const finishedCount = players.filter(p => p.finished).length;
  if (finishedCount === players.length) {
    if (room.endTimer) { clearTimeout(room.endTimer); room.endTimer = null; }
    endRace(roomId);
  } else if (finishedCount === 1 && !room.endTimer) {
    room.endTimer = setTimeout(() => endRace(roomId), 20000);
  }
}

function endRace(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status === "finished") return;
  room.status = "finished";
  if (room.endTimer) { clearTimeout(room.endTimer); room.endTimer = null; }

  const sorted = Array.from(room.players.values()).sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });

  const results = sorted.map((p, i) => ({
    id: p.id, name: p.name, wpm: p.wpm, accuracy: p.accuracy,
    rank: p.finishRank || i + 1, finished: p.finished,
  }));

  results.filter(r => r.finished).forEach(r =>
    addToLeaderboard({ name: r.name, wpm: r.wpm, accuracy: r.accuracy })
  );

  io.to(roomId).emit("race_finished", { results, leaderboard: getLeaderboard() });
  room.cleanupTimer = setTimeout(() => rooms.delete(roomId), 120000);
}

// ─── Sockets ──────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] ${socket.id}`);

  // CREATE ROOM
  socket.on("create_room", ({ playerName }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    const room = createRoom(roomId);
    const player = createPlayer(socket.id, playerName || "Anonymous");
    room.host = socket.id;
    room.players.set(socket.id, player);
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;

    // "room_entered" — single event for both create and join
    socket.emit("room_entered", {
      roomId,
      isHost: true,
      state: getRoomState(room),
    });
    console.log(`[Room] Created: ${roomId} by ${playerName}`);
  });

  // JOIN ROOM
  socket.on("join_room", ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit("error", { message: "Room not found." }); return; }
    if (room.status !== "waiting") { socket.emit("error", { message: "Race already in progress." }); return; }
    if (room.players.size >= 6) { socket.emit("error", { message: "Room is full (max 6)." }); return; }

    const player = createPlayer(socket.id, playerName || "Anonymous");
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;

    // Send full state to the new joiner — they'll switch to lobby screen
    socket.emit("room_entered", {
      roomId,
      isHost: false,
      state: getRoomState(room),
    });

    // Tell everyone already in the room that a new player joined
    socket.to(roomId).emit("player_joined", { state: getRoomState(room) });
    console.log(`[Room] ${playerName} joined ${roomId}`);
  });

  // START RACE (host only)
  socket.on("start_race", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id || room.status !== "waiting") return;
    startCountdown(roomId);
  });

  // PLAY AGAIN (host only) — resets room and broadcasts to ALL players
  socket.on("play_again", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;

    if (room.countdownTimer) { clearTimeout(room.countdownTimer); room.countdownTimer = null; }
    if (room.endTimer) { clearTimeout(room.endTimer); room.endTimer = null; }
    if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }

    room.status = "waiting";
    room.prompt = "";
    room.startTime = null;
    for (const p of room.players.values()) resetPlayer(p);

    // ALL players go back to lobby
    io.to(roomId).emit("room_reset", { state: getRoomState(room) });
    console.log(`[Room] Reset for play again: ${roomId}`);
  });

  // TYPING PROGRESS
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

    if (progress >= room.prompt.length) {
      player.finished = true;
      player.finishTime = Date.now();
      player.finishRank = Array.from(room.players.values()).filter(p => p.finished).length;
      socket.emit("player_finished", { rank: player.finishRank, wpm: player.wpm, accuracy: player.accuracy });
      onPlayerFinished(roomId);
    }

    io.to(roomId).emit("progress_update", {
      playerId: socket.id,
      progress: player.progress, wpm: player.wpm, accuracy: player.accuracy,
      finished: player.finished, finishRank: player.finishRank,
    });
  });

  // LEADERBOARD
  socket.on("get_leaderboard", () => {
    socket.emit("leaderboard_data", { leaderboard: getLeaderboard() });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.delete(socket.id);
    if (room.players.size === 0) {
      if (room.countdownTimer) clearTimeout(room.countdownTimer);
      if (room.endTimer) clearTimeout(room.endTimer);
      rooms.delete(roomId);
    } else {
      if (room.host === socket.id) {
        room.host = room.players.keys().next().value;
        io.to(roomId).emit("host_changed", { newHost: room.host });
      }
      io.to(roomId).emit("player_left", { state: getRoomState(room) });
      if (room.status === "racing") onPlayerFinished(roomId);
    }
  });
});

app.get("/api/leaderboard", (req, res) => res.json({ leaderboard: getLeaderboard() }));
app.get("/health", (req, res) => res.json({ status: "ok", rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));