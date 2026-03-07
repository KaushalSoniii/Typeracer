import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// ─── Socket singleton ─────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
let socket = null;
function getSocket() {
  if (!socket) socket = io(SOCKET_URL, { autoConnect: false });
  return socket;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcWPM(charsTyped, startTime) {
  if (!startTime) return 0;
  const mins = (Date.now() - startTime) / 60000;
  if (mins <= 0) return 0;
  return Math.round(charsTyped / 5 / mins);
}

function calcAccuracy(correct, total) {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

const PLAYER_COLORS = ["#f0c040","#60a5fa","#4ade80","#f87171","#c084fc","#fb923c"];

// ─── Screens ──────────────────────────────────────────────────────────────────
const SCREEN = { HOME: "home", LOBBY: "lobby", RACE: "race", RESULTS: "results" };

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ onCreateRoom, onJoinRoom, leaderboard }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("menu"); // menu | join
  const [error, setError] = useState("");

  return (
    <div style={styles.homeWrap}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: "var(--accent)" }}>type</span>
          <span style={{ color: "var(--text)" }}>racer</span>
          <span style={styles.logoBlink}>_</span>
        </div>
        <p style={styles.tagline}>real-time multiplayer typing races</p>
      </header>

      {/* Main panel */}
      <div style={styles.homePanel}>
        {/* Name input */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>your handle</label>
          <input
            style={styles.input}
            placeholder="anonymous"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
          />
        </div>

        {mode === "menu" && (
          <div style={styles.btnStack}>
            <button style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => {
                setError("");
                onCreateRoom(name || "anonymous");
              }}>
              + create room
            </button>
            <button style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => setMode("join")}>
              → join room
            </button>
          </div>
        )}

        {mode === "join" && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>room code</label>
            <input
              style={{ ...styles.input, letterSpacing: "0.3em", textTransform: "uppercase" }}
              placeholder="ABC123"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}
                onClick={() => {
                  if (!roomCode) { setError("enter a room code"); return; }
                  setError("");
                  onJoinRoom(roomCode, name || "anonymous");
                }}>
                join →
              </button>
              <button style={{ ...styles.btn, ...styles.btnGhost }}
                onClick={() => { setMode("menu"); setRoomCode(""); setError(""); }}>
                back
              </button>
            </div>
          </div>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}
      </div>

      {/* Leaderboard */}
      <div style={styles.leaderboardWrap}>
        <h2 style={styles.sectionTitle}>
          <span style={{ color: "var(--accent)" }}>#</span> global leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>no races yet — be the first!</p>
        ) : (
          <table style={styles.lbTable}>
            <thead>
              <tr>
                {["rank","player","wpm","acc","date"].map(h => (
                  <th key={h} style={styles.lbTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={i} style={i % 2 === 0 ? styles.lbRowEven : styles.lbRowOdd}>
                  <td style={{ ...styles.lbTd, color: i < 3 ? "var(--accent)" : "var(--muted)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                  </td>
                  <td style={styles.lbTd}>{entry.name}</td>
                  <td style={{ ...styles.lbTd, color: "var(--accent)", fontWeight: 700 }}>
                    {entry.wpm}
                  </td>
                  <td style={{ ...styles.lbTd, color: entry.accuracy >= 95 ? "var(--green)" : "var(--text2)" }}>
                    {entry.accuracy}%
                  </td>
                  <td style={{ ...styles.lbTd, color: "var(--muted)", fontSize: 11 }}>
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span style={styles.footerCopy}>© {new Date().getFullYear()}</span>
          <span style={styles.footerDivider}>·</span>
          <span style={styles.footerMadeBy}>crafted by</span>
          <a
            href="https://github.com/KaushalSoniii"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--bg)";
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(240,192,64,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={styles.footerGhIcon}>⌥</span>
            kaushal soni
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
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.lobbyWrap}>
      <div style={styles.lobbyCard}>
        <div style={styles.lobbyHeader}>
          <span style={styles.lobbyRoomLabel}>room</span>
          <div style={styles.lobbyRoomCode} onClick={copyCode}>
            {roomId}
            <span style={{ fontSize: 12, marginLeft: 8, color: "var(--muted)" }}>
              {copied ? "copied!" : "click to copy"}
            </span>
          </div>
        </div>

        <div style={styles.lobbyPlayers}>
          <p style={styles.label}>players ({players.length}/6)</p>
          {players.map((p, i) => (
            <div key={p.id} style={styles.lobbyPlayer}>
              <span style={{ ...styles.dot, background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
              <span style={{ color: p.id === socketId ? "var(--accent)" : "var(--text)" }}>
                {p.name}
              </span>
              {p.id === socketId && <span style={styles.youBadge}>you</span>}
            </div>
          ))}
        </div>

        <div style={styles.lobbyHint}>
          {isHost
            ? players.length < 2
              ? "⌛ waiting for more players to join..."
              : "ready to race!"
            : "⌛ waiting for host to start..."}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {isHost && (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary, flex: 1, fontSize: 16, padding: "14px 0",
                opacity: players.length < 1 ? 0.5 : 1 }}
              onClick={onStart}
              disabled={players.length < 1}
            >
              start race →
            </button>
          )}
          <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onLeave}>
            leave
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function RaceScreen({ prompt, players, socketId, startTime, onProgress, onFinish }) {
  const [typed, setTyped] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef(null);
  const lastReportRef = useRef(0);
  const startTimeRef = useRef(startTime);

  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  useEffect(() => {
    if (started && inputRef.current) inputRef.current.focus();
  }, [started]);

  const handleInput = useCallback((e) => {
    if (finished || !started) return;
    const val = e.target.value;

    // Prevent pasting
    if (val.length - typed.length > 2) return;

    setTyped(val);

    // Count correct chars
    let correctChars = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] === prompt[i]) correctChars++;
    }

    const wpm = calcWPM(correctChars, startTimeRef.current);
    const acc = calcAccuracy(correctChars, val.length);

    // Throttle updates to every 200ms or every 5 chars
    const now = Date.now();
    if (now - lastReportRef.current > 200 || Math.abs(val.length - lastReportRef.current) >= 5) {
      lastReportRef.current = now;
      onProgress({
        progress: correctChars,
        wpm,
        accuracy: acc,
        errors: val.length - correctChars,
        totalTyped: val.length,
      });
    }

    // Check win condition
    if (val === prompt) {
      setFinished(true);
      onFinish({ wpm, accuracy: acc });
    }
  }, [finished, started, typed, prompt, onProgress, onFinish]);

  // Render prompt chars
  const renderPrompt = () => {
    return prompt.split("").map((char, i) => {
      let color = "var(--muted)";
      if (i < typed.length) {
        color = typed[i] === char ? "var(--text)" : "var(--red)";
      }
      const isCursor = i === typed.length;
      return (
        <span key={i} style={{
          color,
          borderBottom: isCursor ? "2px solid var(--accent)" : "none",
          background: isCursor ? "rgba(240,192,64,0.1)" : "transparent",
          transition: "color 0.05s",
        }}>{char}</span>
      );
    });
  };

  const me = players.find(p => p.id === socketId);
  const myProgress = me ? Math.round((me.progress / prompt.length) * 100) : 0;

  return (
    <div style={styles.raceWrap}>
      {/* Countdown overlay */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <div style={styles.countdownNum}>{countdown === 0 ? "GO!" : countdown}</div>
        </div>
      )}

      {/* Racers */}
      <div style={styles.racersPanel}>
        {players.map((p, i) => {
          const pct = prompt ? Math.round((p.progress / prompt.length) * 100) : 0;
          return (
            <div key={p.id} style={styles.racer}>
              <div style={styles.racerInfo}>
                <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontWeight: 600, fontSize: 13 }}>
                  {p.name}{p.id === socketId ? " (you)" : ""}
                </span>
                <span style={{ color: "var(--accent)", fontSize: 13, marginLeft: "auto" }}>
                  {p.wpm} wpm
                </span>
                {p.finished && <span style={styles.finBadge}>#{p.finishRank}</span>}
              </div>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressBar,
                  width: `${pct}%`,
                  background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                }} />
                <span style={{ ...styles.carIcon, left: `calc(${pct}% - 10px)` }}>🏎</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing area */}
      <div style={styles.typingPanel}>
        <div style={styles.promptDisplay}>{renderPrompt()}</div>

        <input
          ref={inputRef}
          style={styles.typeInput}
          value={typed}
          onChange={handleInput}
          disabled={!started || finished}
          placeholder={!started ? "get ready..." : finished ? "finished! 🎉" : "type here..."}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>wpm</span>
            <span style={{ ...styles.statVal, color: "var(--accent)" }}>{me?.wpm || 0}</span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>acc</span>
            <span style={{ ...styles.statVal, color: me?.accuracy >= 95 ? "var(--green)" : "var(--red)" }}>
              {me?.accuracy || 100}%
            </span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>progress</span>
            <span style={{ ...styles.statVal, color: "var(--blue)" }}>{myProgress}%</span>
          </div>
        </div>
      </div>

      {/* expose setCountdown / setStarted to parent via imperative handle */}
      <RaceController
        onSetCountdown={setCountdown}
        onSetStarted={setStarted}
      />
    </div>
  );
}

// Tiny helper to expose setters to parent via ref-like pattern (event driven)
function RaceController({ onSetCountdown, onSetStarted }) {
  useEffect(() => {
    window.__raceSetCountdown = onSetCountdown;
    window.__raceSetStarted = onSetStarted;
    return () => {
      delete window.__raceSetCountdown;
      delete window.__raceSetStarted;
    };
  }, [onSetCountdown, onSetStarted]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function ResultsScreen({ results, leaderboard, onPlayAgain, onHome }) {
  return (
    <div style={styles.resultsWrap}>
      <h1 style={styles.resultsTitle}>race complete</h1>

      {/* Podium */}
      <div style={styles.podiumRow}>
        {results.slice(0, 3).map((r, i) => (
          <div key={r.id} style={{ ...styles.podiumCard, order: i === 0 ? 1 : i === 1 ? 0 : 2 }}>
            <div style={styles.podiumMedal}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
            <div style={styles.podiumName}>{r.name}</div>
            <div style={styles.podiumWpm}>
              <span style={{ color: "var(--accent)", fontSize: 28, fontWeight: 700 }}>{r.wpm}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}> wpm</span>
            </div>
            <div style={{ color: r.accuracy >= 95 ? "var(--green)" : "var(--text2)", fontSize: 13 }}>
              {r.accuracy}% acc
            </div>
          </div>
        ))}
      </div>

      {/* Full results */}
      {results.length > 3 && (
        <div style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
          {results.slice(3).map((r, i) => (
            <div key={r.id} style={styles.resultRow}>
              <span style={{ color: "var(--muted)" }}>#{i + 4}</span>
              <span style={{ flex: 1, marginLeft: 12 }}>{r.name}</span>
              <span style={{ color: "var(--accent)" }}>{r.wpm} wpm</span>
              <span style={{ color: "var(--text2)", marginLeft: 12 }}>{r.accuracy}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard preview */}
      {leaderboard.length > 0 && (
        <div style={styles.miniLb}>
          <p style={{ color: "var(--accent)", fontSize: 12, marginBottom: 8 }}># all-time top 5</p>
          {leaderboard.slice(0, 5).map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, color: "var(--text2)", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "var(--muted)", width: 24 }}>#{i+1}</span>
              <span style={{ flex: 1 }}>{e.name}</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>{e.wpm}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onPlayAgain}>
          play again →
        </button>
        <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onHome}>
          home
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [socketId, setSocketId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

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

    sk.on("room_created", ({ roomId, state }) => {
      setRoomId(roomId);
      setPlayers(state.players);
      setIsHost(true);
      setScreen(SCREEN.LOBBY);
    });

    sk.on("player_joined", ({ state }) => {
      setPlayers(state.players);
      notify(`${state.players[state.players.length - 1]?.name} joined!`);
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

    sk.on("countdown_start", ({ prompt }) => {
      setPrompt(prompt);
      setScreen(SCREEN.RACE);
    });

    sk.on("countdown_tick", ({ count }) => {
      window.__raceSetCountdown?.(count);
    });

    sk.on("race_start", ({ startTime }) => {
      setStartTime(startTime);
      window.__raceSetCountdown?.(null);
      window.__raceSetStarted?.(true);
    });

    sk.on("progress_update", ({ playerId, progress, wpm, accuracy, finished, finishRank }) => {
      setPlayers(prev =>
        prev.map(p =>
          p.id === playerId ? { ...p, progress, wpm, accuracy, finished, finishRank } : p
        )
      );
    });

    sk.on("race_finished", ({ results, leaderboard }) => {
      setResults(results);
      setLeaderboard(leaderboard);
      setScreen(SCREEN.RESULTS);
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
  const handleCreateRoom = (name) => {
    sk.emit("create_room", { playerName: name });
  };

  const handleJoinRoom = (code, name) => {
    sk.emit("join_room", { roomId: code, playerName: name });
  };

  const handleStartRace = () => {
    sk.emit("start_race");
  };

  const handleProgress = useCallback(({ progress, wpm, accuracy, errors, totalTyped }) => {
    sk.emit("typing_progress", { progress, wpm, accuracy, errors, totalTyped });
  }, []);

  const handleFinish = useCallback(({ wpm, accuracy }) => {
    // server handles this via progress_update when progress === prompt.length
  }, []);

  const handleLeave = () => {
    sk.disconnect();
    sk.connect();
    setScreen(SCREEN.HOME);
    setRoomId(""); setPlayers([]); setIsHost(false);
    setPrompt(""); setStartTime(null); setResults([]);
    sk.emit("get_leaderboard");
  };

  const handlePlayAgain = () => {
    setScreen(SCREEN.LOBBY);
    setResults([]); setPrompt(""); setStartTime(null);
    setPlayers(prev => prev.map(p => ({ ...p, progress: 0, wpm: 0, accuracy: 100, finished: false, finishRank: null })));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Global notification */}
      {notification && (
        <div style={styles.notification}>{notification}</div>
      )}
      {error && (
        <div style={{ ...styles.notification, background: "var(--red)", color: "#fff" }}>
          ✗ {error}
        </div>
      )}

      {screen === SCREEN.HOME && (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          leaderboard={leaderboard}
        />
      )}
      {screen === SCREEN.LOBBY && (
        <LobbyScreen
          roomId={roomId}
          players={players}
          isHost={isHost}
          socketId={socketId}
          onStart={handleStartRace}
          onLeave={handleLeave}
        />
      )}
      {screen === SCREEN.RACE && (
        <RaceScreen
          prompt={prompt}
          players={players}
          socketId={socketId}
          startTime={startTime}
          onProgress={handleProgress}
          onFinish={handleFinish}
        />
      )}
      {screen === SCREEN.RESULTS && (
        <ResultsScreen
          results={results}
          leaderboard={leaderboard}
          onPlayAgain={handlePlayAgain}
          onHome={handleLeave}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = {
  // ── Home ────────────────────────────────────────────────────────────────────
  homeWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 60px",
    gap: 32,
  },
  header: { textAlign: "center" },
  logo: {
    fontSize: "clamp(36px, 8vw, 72px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },
  logoBlink: {
    color: "var(--accent)",
    animation: "blink 1s step-end infinite",
    display: "inline-block",
  },
  tagline: {
    color: "var(--muted)",
    fontSize: 13,
    marginTop: 8,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  homePanel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "28px 32px",
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" },
  input: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "10px 14px",
    color: "var(--text)",
    fontSize: 15,
    width: "100%",
    transition: "border-color 0.2s",
  },
  btnStack: { display: "flex", flexDirection: "column", gap: 10 },
  btn: {
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.05em",
    transition: "all 0.15s",
  },
  btnPrimary: {
    background: "var(--accent)",
    color: "var(--bg)",
  },
  btnSecondary: {
    background: "var(--surface2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
  },
  btnGhost: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  },
  errorMsg: { color: "var(--red)", fontSize: 13 },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    width: "100%",
    maxWidth: 600,
    marginTop: 12,
    paddingTop: 20,
    borderTop: "1px solid var(--border)",
  },
  footerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  footerCopy: {
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: "0.05em",
  },
  footerDivider: {
    color: "var(--border)",
    fontSize: 14,
  },
  footerMadeBy: {
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "lowercase",
  },
  footerLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    color: "var(--accent)",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.06em",
    padding: "4px 12px",
    borderRadius: 20,
    border: "1px solid var(--accent)",
    background: "transparent",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  footerGhIcon: {
    fontSize: 14,
    opacity: 0.8,
  },

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  leaderboardWrap: {
    width: "100%",
    maxWidth: 600,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionTitle: { fontSize: 14, color: "var(--text2)", fontWeight: 400, letterSpacing: "0.08em" },
  lbTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  lbTh: {
    color: "var(--muted)",
    fontWeight: 400,
    textAlign: "left",
    padding: "6px 12px 6px 0",
    borderBottom: "1px solid var(--border)",
    letterSpacing: "0.05em",
    fontSize: 11,
    textTransform: "uppercase",
  },
  lbTd: { padding: "8px 12px 8px 0", color: "var(--text)" },
  lbRowEven: { background: "transparent" },
  lbRowOdd: { background: "rgba(255,255,255,0.02)" },

  // ── Lobby ───────────────────────────────────────────────────────────────────
  lobbyWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  lobbyCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "32px 36px",
    width: "100%",
    maxWidth: 440,
  },
  lobbyHeader: { marginBottom: 24 },
  lobbyRoomLabel: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" },
  lobbyRoomCode: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: "0.25em",
    color: "var(--accent)",
    cursor: "pointer",
    display: "flex",
    alignItems: "baseline",
  },
  lobbyPlayers: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  lobbyPlayer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    background: "var(--surface2)",
    borderRadius: 8,
  },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  youBadge: {
    marginLeft: "auto",
    fontSize: 10,
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "2px 6px",
    borderRadius: 4,
    fontWeight: 700,
  },
  lobbyHint: { color: "var(--muted)", fontSize: 13 },

  // ── Race ────────────────────────────────────────────────────────────────────
  raceWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px 20px",
    gap: 20,
    maxWidth: 860,
    margin: "0 auto",
  },
  countdownOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  countdownNum: {
    fontSize: "clamp(80px, 20vw, 160px)",
    fontWeight: 700,
    color: "var(--accent)",
    animation: "pop 0.3s ease",
  },
  racersPanel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  racer: { display: "flex", flexDirection: "column", gap: 5 },
  racerInfo: { display: "flex", alignItems: "center", gap: 8 },
  progressTrack: {
    height: 12,
    background: "var(--surface2)",
    borderRadius: 6,
    overflow: "visible",
    position: "relative",
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
    transition: "width 0.15s ease",
    opacity: 0.8,
  },
  carIcon: {
    position: "absolute",
    top: -4,
    fontSize: 18,
    transition: "left 0.15s ease",
    pointerEvents: "none",
  },
  finBadge: {
    background: "var(--accent)",
    color: "var(--bg)",
    fontSize: 11,
    fontWeight: 700,
    padding: "1px 7px",
    borderRadius: 20,
    marginLeft: 4,
  },
  typingPanel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "28px 28px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  promptDisplay: {
    fontSize: "clamp(15px, 2.5vw, 20px)",
    lineHeight: 1.85,
    letterSpacing: "0.02em",
    userSelect: "none",
    wordBreak: "break-word",
  },
  typeInput: {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 16,
    color: "var(--text)",
    letterSpacing: "0.02em",
  },
  statsBar: { display: "flex", gap: 10 },
  statChip: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    alignItems: "center",
  },
  statLabel: { fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" },
  statVal: { fontSize: 20, fontWeight: 700 },

  // ── Results ─────────────────────────────────────────────────────────────────
  resultsWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 60px",
    gap: 24,
  },
  resultsTitle: {
    fontSize: "clamp(28px, 7vw, 56px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  podiumRow: {
    display: "flex",
    gap: 16,
    alignItems: "flex-end",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  podiumCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "20px 24px",
    textAlign: "center",
    minWidth: 130,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    alignItems: "center",
  },
  podiumMedal: { fontSize: 32 },
  podiumName: { fontWeight: 600, fontSize: 14, color: "var(--text)" },
  podiumWpm: { display: "flex", alignItems: "baseline" },
  resultRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    fontSize: 14,
  },
  miniLb: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "16px 20px",
    width: "100%",
    maxWidth: 340,
  },

  // ── Global ──────────────────────────────────────────────────────────────────
  notification: {
    position: "fixed",
    top: 16,
    right: 16,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    zIndex: 9999,
    animation: "slideIn 0.2s ease",
  },
};

// CSS keyframes injection
const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes pop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
  button:hover { filter: brightness(1.15); transform: translateY(-1px); }
  button:active { transform: translateY(0); filter: brightness(0.95); }
  input:focus { border-color: var(--accent) !important; }
`;
document.head.appendChild(styleTag);
