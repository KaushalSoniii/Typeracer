import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// ─── Socket ───────────────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
let _socket = null;
function getSocket() {
  if (!_socket) _socket = io(SOCKET_URL, { autoConnect: false });
  return _socket;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcWPM(charsTyped, startTime) {
  if (!startTime) return 0;
  const mins = (Date.now() - startTime) / 60000;
  if (mins < 0.001) return 0;
  return Math.round(charsTyped / 5 / mins);
}
function calcAccuracy(correct, total) {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

const PLAYER_COLORS = ["#f0c040","#60a5fa","#4ade80","#f87171","#c084fc","#fb923c"];
const SCREEN = { HOME: "home", LOBBY: "lobby", RACE: "race", RESULTS: "results" };

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ onCreateRoom, onJoinRoom, leaderboard }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("menu");
  const [error, setError] = useState("");

  const doJoin = () => {
    if (!roomCode.trim()) { setError("enter a room code"); return; }
    setError("");
    onJoinRoom(roomCode.trim().toUpperCase(), name.trim() || "anonymous");
  };

  return (
    <div style={S.homeWrap}>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={{ color: "var(--accent)" }}>type</span>
          <span style={{ color: "var(--text)" }}>racer</span>
          <span style={S.logoBlink}>_</span>
        </div>
        <p style={S.tagline}>real-time multiplayer typing races</p>
      </header>

      <div style={S.homePanel}>
        <div style={S.fieldGroup}>
          <label style={S.label}>your handle</label>
          <input style={S.input} placeholder="anonymous" value={name}
            onChange={e => setName(e.target.value)} maxLength={20} />
        </div>

        {mode === "menu" && (
          <div style={S.btnStack}>
            <button style={{ ...S.btn, ...S.btnPrimary }}
              onClick={() => { setError(""); onCreateRoom(name.trim() || "anonymous"); }}>
              + create room
            </button>
            <button style={{ ...S.btn, ...S.btnSecondary }} onClick={() => setMode("join")}>
              → join room
            </button>
          </div>
        )}

        {mode === "join" && (
          <div style={S.fieldGroup}>
            <label style={S.label}>room code</label>
            <input
              style={{ ...S.input, letterSpacing: "0.3em", textTransform: "uppercase" }}
              placeholder="ABC123"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && doJoin()}
              maxLength={6}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ ...S.btn, ...S.btnPrimary, flex: 1 }} onClick={doJoin}>
                join →
              </button>
              <button style={{ ...S.btn, ...S.btnGhost }}
                onClick={() => { setMode("menu"); setRoomCode(""); setError(""); }}>
                back
              </button>
            </div>
          </div>
        )}

        {error && <p style={S.errorMsg}>✗ {error}</p>}
      </div>

      <div style={S.leaderboardWrap}>
        <h2 style={S.sectionTitle}><span style={{ color: "var(--accent)" }}>#</span> global leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>no races yet — be the first!</p>
        ) : (
          <table style={S.lbTable}>
            <thead>
              <tr>{["rank","player","wpm","acc","date"].map(h => <th key={h} style={S.lbTh}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={i} style={i % 2 === 0 ? S.lbRowEven : S.lbRowOdd}>
                  <td style={{ ...S.lbTd, color: i < 3 ? "var(--accent)" : "var(--muted)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                  </td>
                  <td style={S.lbTd}>{e.name}</td>
                  <td style={{ ...S.lbTd, color: "var(--accent)", fontWeight: 700 }}>{e.wpm}</td>
                  <td style={{ ...S.lbTd, color: e.accuracy >= 95 ? "var(--green)" : "var(--text2)" }}>{e.accuracy}%</td>
                  <td style={{ ...S.lbTd, color: "var(--muted)", fontSize: 11 }}>{new Date(e.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <span style={S.footerCopy}>© {new Date().getFullYear()}</span>
          <span style={S.footerDivider}>·</span>
          <span style={S.footerMadeBy}>crafted by</span>
          <a href="https://github.com/KaushalSoniii" target="_blank" rel="noopener noreferrer"
            style={S.footerLink}
            onMouseEnter={e => { e.currentTarget.style.color="var(--bg)"; e.currentTarget.style.background="var(--accent)"; e.currentTarget.style.boxShadow="0 0 16px rgba(240,192,64,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.color="var(--accent)"; e.currentTarget.style.background="transparent"; e.currentTarget.style.boxShadow="none"; }}>
            <span style={S.footerGhIcon}>⌥</span> kaushal soni
          </a>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LobbyScreen({ roomId, players, isHost, socketId, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={S.lobbyWrap}>
      <div style={S.lobbyCard}>
        <div style={S.lobbyHeader}>
          <span style={S.lobbyRoomLabel}>room code</span>
          <div style={S.lobbyRoomCode} onClick={copyCode}>
            {roomId}
            <span style={{ fontSize: 12, marginLeft: 10, color: "var(--muted)", fontWeight: 400 }}>
              {copied ? "✓ copied!" : "click to copy"}
            </span>
          </div>
        </div>

        <div style={S.lobbyPlayers}>
          <p style={S.label}>players ({players.length}/6)</p>
          {players.map((p, i) => (
            <div key={p.id} style={S.lobbyPlayer}>
              <span style={{ ...S.dot, background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
              <span style={{ color: p.id === socketId ? "var(--accent)" : "var(--text)", flex: 1 }}>
                {p.name}
              </span>
              {p.id === socketId && <span style={S.youBadge}>you</span>}
              {p.id === roomId && <span style={{ ...S.youBadge, background: "var(--blue)" }}>host</span>}
            </div>
          ))}
          {players.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>connecting...</p>
          )}
        </div>

        <div style={S.lobbyHint}>
          {isHost
            ? players.length < 2 ? "⌛ share the code — waiting for players..." : "✓ ready! start whenever."
            : "⌛ waiting for the host to start the race..."}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {isHost && (
            <button
              style={{ ...S.btn, ...S.btnPrimary, flex: 1, fontSize: 15, padding: "13px 0" }}
              onClick={onStart}>
              start race →
            </button>
          )}
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={onLeave}>leave</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE SCREEN
// countdown & raceStarted come from App-level state (no window globals)
// raceKey forces full remount on each new race
// ═══════════════════════════════════════════════════════════════════════════════
function RaceScreen({ prompt, players, socketId, startTime, countdown, raceStarted, onProgress }) {
  const [typed, setTyped] = useState("");
  const [localFinished, setLocalFinished] = useState(false);
  const inputRef = useRef(null);
  const startTimeRef = useRef(startTime);
  const lastEmitRef = useRef(0);

  // Keep startTime ref in sync
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // Focus input when race starts
  useEffect(() => {
    if (raceStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [raceStarted]);

  const handleInput = useCallback((e) => {
    if (localFinished || !raceStarted) return;
    const val = e.target.value;
    if (val.length - typed.length > 3) return; // prevent paste

    setTyped(val);

    let correct = 0;
    for (let i = 0; i < val.length; i++) {
      if (prompt[i] === val[i]) correct++;
    }

    const wpm = calcWPM(correct, startTimeRef.current);
    const acc = calcAccuracy(correct, val.length);

    const now = Date.now();
    if (now - lastEmitRef.current > 150) {
      lastEmitRef.current = now;
      onProgress({ progress: correct, wpm, accuracy: acc, errors: val.length - correct, totalTyped: val.length });
    }

    if (correct >= prompt.length && val.length >= prompt.length) {
      setLocalFinished(true);
      // Final progress emit
      onProgress({ progress: correct, wpm, accuracy: acc, errors: val.length - correct, totalTyped: val.length });
    }
  }, [localFinished, raceStarted, typed, prompt, onProgress]);

  const renderPrompt = () => prompt.split("").map((char, i) => {
    let color = "var(--muted)";
    if (i < typed.length) color = typed[i] === char ? "var(--text)" : "var(--red)";
    const isCursor = i === typed.length;
    return (
      <span key={i} style={{
        color,
        borderBottom: isCursor ? "2px solid var(--accent)" : "none",
        background: isCursor ? "rgba(240,192,64,0.12)" : "transparent",
        transition: "color 0.04s",
      }}>{char}</span>
    );
  });

  const me = players.find(p => p.id === socketId);
  const myProgress = me && prompt ? Math.round((me.progress / prompt.length) * 100) : 0;

  return (
    <div style={S.raceWrap}>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div style={S.countdownOverlay}>
          <div style={S.countdownNum} key={countdown}>
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      )}

      {/* Progress bars */}
      <div style={S.racersPanel}>
        <p style={{ ...S.label, marginBottom: 6 }}>racers</p>
        {players.map((p, i) => {
          const pct = prompt ? Math.min(100, Math.round((p.progress / prompt.length) * 100)) : 0;
          return (
            <div key={p.id} style={S.racer}>
              <div style={S.racerInfo}>
                <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontWeight: 600, fontSize: 13 }}>
                  {p.name}{p.id === socketId ? " (you)" : ""}
                </span>
                <span style={{ color: "var(--accent)", fontSize: 13, marginLeft: "auto" }}>{p.wpm} wpm</span>
                {p.finished && <span style={S.finBadge}>#{p.finishRank}</span>}
              </div>
              <div style={S.progressTrack}>
                <div style={{ ...S.progressBar, width: `${pct}%`, background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                <span style={{ ...S.carIcon, left: `calc(${Math.max(0, pct)}% - 10px)` }}>🏎</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing area */}
      <div style={S.typingPanel}>
        <div style={S.promptDisplay}>{renderPrompt()}</div>

        <input
          ref={inputRef}
          style={S.typeInput}
          value={typed}
          onChange={handleInput}
          disabled={!raceStarted || localFinished}
          placeholder={
            countdown !== null ? `starting in ${countdown}...` :
            !raceStarted ? "get ready..." :
            localFinished ? "finished! 🎉" : "start typing..."
          }
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        <div style={S.statsBar}>
          <div style={S.statChip}>
            <span style={S.statLabel}>wpm</span>
            <span style={{ ...S.statVal, color: "var(--accent)" }}>{me?.wpm || 0}</span>
          </div>
          <div style={S.statChip}>
            <span style={S.statLabel}>accuracy</span>
            <span style={{ ...S.statVal, color: (me?.accuracy ?? 100) >= 95 ? "var(--green)" : "var(--red)" }}>
              {me?.accuracy ?? 100}%
            </span>
          </div>
          <div style={S.statChip}>
            <span style={S.statLabel}>progress</span>
            <span style={{ ...S.statVal, color: "var(--blue)" }}>{myProgress}%</span>
          </div>
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function ResultsScreen({ results, leaderboard, isHost, onPlayAgain, onHome }) {
  return (
    <div style={S.resultsWrap}>
      <h1 style={S.resultsTitle}>race complete</h1>

      <div style={S.podiumRow}>
        {results.slice(0, 3).map((r, i) => (
          <div key={r.id} style={{ ...S.podiumCard, order: i === 0 ? 1 : i === 1 ? 0 : 2 }}>
            <div style={S.podiumMedal}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
            <div style={S.podiumName}>{r.name}</div>
            <div style={S.podiumWpm}>
              <span style={{ color: "var(--accent)", fontSize: 28, fontWeight: 700 }}>{r.wpm}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}> wpm</span>
            </div>
            <div style={{ color: r.accuracy >= 95 ? "var(--green)" : "var(--text2)", fontSize: 13 }}>
              {r.accuracy}% acc {!r.finished && <span style={{ color: "var(--muted)" }}>(dnf)</span>}
            </div>
          </div>
        ))}
      </div>

      {results.length > 3 && (
        <div style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
          {results.slice(3).map((r, i) => (
            <div key={r.id} style={S.resultRow}>
              <span style={{ color: "var(--muted)" }}>#{i + 4}</span>
              <span style={{ flex: 1, marginLeft: 12 }}>{r.name}</span>
              <span style={{ color: "var(--accent)" }}>{r.wpm} wpm</span>
              <span style={{ color: "var(--text2)", marginLeft: 12 }}>{r.accuracy}%</span>
              {!r.finished && <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>dnf</span>}
            </div>
          ))}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div style={S.miniLb}>
          <p style={{ color: "var(--accent)", fontSize: 12, marginBottom: 8 }}># all-time top 5</p>
          {leaderboard.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, color: "var(--text2)", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: "var(--muted)", width: 24 }}>#{i+1}</span>
              <span style={{ flex: 1 }}>{e.name}</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>{e.wpm}</span>
              <span style={{ color: "var(--muted)" }}>{e.accuracy}%</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {isHost ? (
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onPlayAgain}>
            play again →
          </button>
        ) : (
          <div style={{ ...S.btn, color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 20px", fontSize: 13 }}>
            ⌛ waiting for host to restart...
          </div>
        )}
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onHome}>home</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP — all socket logic lives here
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]         = useState(SCREEN.HOME);
  const [roomId, setRoomId]         = useState("");
  const [players, setPlayers]       = useState([]);
  const [isHost, setIsHost]         = useState(false);
  const [socketId, setSocketId]     = useState("");
  const [prompt, setPrompt]         = useState("");
  const [startTime, setStartTime]   = useState(null);
  const [results, setResults]       = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError]           = useState("");
  const [notification, setNotification] = useState("");

  // ── Race-specific state at App level (no more window globals!) ──
  const [countdown, setCountdown]   = useState(null);  // 3, 2, 1, 0, or null
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceKey, setRaceKey]       = useState(0); // increment to force RaceScreen remount

  const sk = getSocket();

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // ── Socket Setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    sk.connect();

    sk.on("connect", () => {
      setSocketId(sk.id);
      sk.emit("get_leaderboard");
    });

    // FIX #1: Single event for both create and join — always switches to lobby with full state
    sk.on("room_entered", ({ roomId, isHost, state }) => {
      setRoomId(roomId);
      setIsHost(isHost);
      setPlayers(state.players);
      setScreen(SCREEN.LOBBY);
    });

    // Someone new joined — update player list for everyone already in the room
    sk.on("player_joined", ({ state }) => {
      setPlayers(state.players);
      const newest = state.players[state.players.length - 1];
      if (newest) notify(`${newest.name} joined!`);
    });

    sk.on("player_left", ({ state }) => {
      setPlayers(state.players);
      notify("a player left");
    });

    sk.on("host_changed", ({ newHost }) => {
      if (newHost === sk.id) {
        setIsHost(true);
        notify("you are now the host");
      }
    });

    // Race countdown starting — go to race screen and reset race state
    sk.on("countdown_start", ({ prompt }) => {
      setPrompt(prompt);
      setCountdown(null);
      setRaceStarted(false);
      setRaceKey(k => k + 1);    // force RaceScreen full remount
      setScreen(SCREEN.RACE);
    });

    // FIX #2: countdown ticks update App-level state directly — no window globals
    sk.on("countdown_tick", ({ count }) => {
      setCountdown(count);
    });

    // Race starts — clear countdown, enable typing
    sk.on("race_start", ({ startTime }) => {
      setStartTime(startTime);
      setCountdown(null);
      setRaceStarted(true);
    });

    sk.on("progress_update", ({ playerId, progress, wpm, accuracy, finished, finishRank }) => {
      setPlayers(prev =>
        prev.map(p => p.id === playerId ? { ...p, progress, wpm, accuracy, finished, finishRank } : p)
      );
    });

    sk.on("race_finished", ({ results, leaderboard }) => {
      setResults(results);
      setLeaderboard(leaderboard);
      setScreen(SCREEN.RESULTS);
    });

    // FIX #3: play_again — server resets room and broadcasts this to ALL players
    sk.on("room_reset", ({ state }) => {
      setPrompt("");
      setStartTime(null);
      setResults([]);
      setCountdown(null);
      setRaceStarted(false);
      setPlayers(state.players);
      setScreen(SCREEN.LOBBY);    // everyone goes back to lobby
    });

    sk.on("leaderboard_data", ({ leaderboard }) => {
      setLeaderboard(leaderboard);
    });

    sk.on("error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    return () => {
      sk.removeAllListeners();
      sk.disconnect();
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreateRoom = (name) => sk.emit("create_room", { playerName: name });
  const handleJoinRoom   = (code, name) => sk.emit("join_room", { roomId: code, playerName: name });
  const handleStartRace  = () => sk.emit("start_race");

  const handleProgress = useCallback((data) => {
    sk.emit("typing_progress", data);
  }, []);

  // FIX #3: Host emits to server — server resets and broadcasts room_reset to all
  const handlePlayAgain = () => sk.emit("play_again");

  const handleLeave = () => {
    sk.disconnect();
    setTimeout(() => {
      sk.connect();
      setScreen(SCREEN.HOME);
      setRoomId(""); setPlayers([]); setIsHost(false);
      setPrompt(""); setStartTime(null); setResults([]);
      setCountdown(null); setRaceStarted(false);
      sk.emit("get_leaderboard");
    }, 100);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {notification && <div style={S.notification}>{notification}</div>}
      {error && <div style={{ ...S.notification, background: "var(--red)", color: "#fff" }}>✗ {error}</div>}

      {screen === SCREEN.HOME && (
        <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} leaderboard={leaderboard} />
      )}
      {screen === SCREEN.LOBBY && (
        <LobbyScreen
          roomId={roomId} players={players} isHost={isHost}
          socketId={socketId} onStart={handleStartRace} onLeave={handleLeave}
        />
      )}
      {screen === SCREEN.RACE && (
        <RaceScreen
          key={raceKey}
          prompt={prompt} players={players} socketId={socketId}
          startTime={startTime} countdown={countdown} raceStarted={raceStarted}
          onProgress={handleProgress}
        />
      )}
      {screen === SCREEN.RESULTS && (
        <ResultsScreen
          results={results} leaderboard={leaderboard} isHost={isHost}
          onPlayAgain={handlePlayAgain} onHome={handleLeave}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  homeWrap: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 60px", gap: 32 },
  header: { textAlign: "center" },
  logo: { fontSize: "clamp(36px, 8vw, 72px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  logoBlink: { color: "var(--accent)", animation: "blink 1s step-end infinite", display: "inline-block" },
  tagline: { color: "var(--muted)", fontSize: 13, marginTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" },
  homePanel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" },
  input: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", color: "var(--text)", fontSize: 15, width: "100%", transition: "border-color 0.2s" },
  btnStack: { display: "flex", flexDirection: "column", gap: 10 },
  btn: { padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", transition: "all 0.15s" },
  btnPrimary: { background: "var(--accent)", color: "var(--bg)" },
  btnSecondary: { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" },
  btnGhost: { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" },
  errorMsg: { color: "var(--red)", fontSize: 13 },

  footer: { width: "100%", maxWidth: 600, marginTop: 12, paddingTop: 20, borderTop: "1px solid var(--border)" },
  footerInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  footerCopy: { color: "var(--muted)", fontSize: 12, letterSpacing: "0.05em" },
  footerDivider: { color: "var(--border)", fontSize: 14 },
  footerMadeBy: { color: "var(--muted)", fontSize: 12, letterSpacing: "0.08em" },
  footerLink: { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", padding: "4px 12px", borderRadius: 20, border: "1px solid var(--accent)", background: "transparent", transition: "all 0.2s ease", cursor: "pointer" },
  footerGhIcon: { fontSize: 14, opacity: 0.8 },

  leaderboardWrap: { width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { fontSize: 14, color: "var(--text2)", fontWeight: 400, letterSpacing: "0.08em" },
  lbTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  lbTh: { color: "var(--muted)", fontWeight: 400, textAlign: "left", padding: "6px 12px 6px 0", borderBottom: "1px solid var(--border)", letterSpacing: "0.05em", fontSize: 11, textTransform: "uppercase" },
  lbTd: { padding: "8px 12px 8px 0", color: "var(--text)" },
  lbRowEven: { background: "transparent" },
  lbRowOdd: { background: "rgba(255,255,255,0.02)" },

  lobbyWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  lobbyCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "32px 36px", width: "100%", maxWidth: 440 },
  lobbyHeader: { marginBottom: 24 },
  lobbyRoomLabel: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" },
  lobbyRoomCode: { fontSize: 40, fontWeight: 700, letterSpacing: "0.25em", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "baseline" },
  lobbyPlayers: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  lobbyPlayer: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--surface2)", borderRadius: 8 },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  youBadge: { fontSize: 10, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 },
  lobbyHint: { color: "var(--muted)", fontSize: 13 },

  raceWrap: { minHeight: "100vh", display: "flex", flexDirection: "column", padding: "24px 20px", gap: 20, maxWidth: 860, margin: "0 auto" },
  countdownOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  countdownNum: { fontSize: "clamp(80px, 20vw, 160px)", fontWeight: 700, color: "var(--accent)", animation: "pop 0.3s ease" },
  racersPanel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  racer: { display: "flex", flexDirection: "column", gap: 5 },
  racerInfo: { display: "flex", alignItems: "center", gap: 8 },
  progressTrack: { height: 12, background: "var(--surface2)", borderRadius: 6, overflow: "visible", position: "relative" },
  progressBar: { height: "100%", borderRadius: 6, transition: "width 0.12s ease", opacity: 0.85 },
  carIcon: { position: "absolute", top: -4, fontSize: 18, transition: "left 0.12s ease", pointerEvents: "none" },
  finBadge: { background: "var(--accent)", color: "var(--bg)", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, marginLeft: 4 },
  typingPanel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 28px 20px", display: "flex", flexDirection: "column", gap: 16 },
  promptDisplay: { fontSize: "clamp(15px, 2.5vw, 20px)", lineHeight: 1.85, letterSpacing: "0.02em", userSelect: "none", wordBreak: "break-word" },
  typeInput: { width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", fontSize: 16, color: "var(--text)", letterSpacing: "0.02em" },
  statsBar: { display: "flex", gap: 10 },
  statChip: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" },
  statLabel: { fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" },
  statVal: { fontSize: 20, fontWeight: 700 },

  resultsWrap: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 60px", gap: 24 },
  resultsTitle: { fontSize: "clamp(28px, 7vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em" },
  podiumRow: { display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" },
  podiumCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", textAlign: "center", minWidth: 130, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" },
  podiumMedal: { fontSize: 32 },
  podiumName: { fontWeight: 600, fontSize: 14, color: "var(--text)" },
  podiumWpm: { display: "flex", alignItems: "baseline" },
  resultRow: { display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 14 },
  miniLb: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", width: "100%", maxWidth: 340 },

  notification: { position: "fixed", top: 16, right: 16, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999, animation: "slideIn 0.2s ease" },
};

// Inject keyframes
const _style = document.createElement("style");
_style.textContent = `
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  button:hover { filter: brightness(1.15); transform: translateY(-1px); }
  button:active { transform: translateY(0); filter: brightness(0.95); }
  input:focus { border-color: var(--accent) !important; }
`;
document.head.appendChild(_style);