import { useState, useEffect, useRef } from "react";

const PLAYER_COLORS = ["#f0c040","#60a5fa","#4ade80","#f87171","#c084fc","#fb923c"];

function getPlayerColor(playerId, players) {
  const idx = players.findIndex(p => p.id === playerId);
  return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : "#9999aa";
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ messages, players, socketId, onSendMessage, disabled }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const send = () => {
    const text = input.trim();
    if (!text || disabled) return;
    onSendMessage(text);
    setInput("");
    setAutoScroll(true);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.headerDot} />
        <span style={S.headerTitle}>room chat</span>
        <span style={S.headerCount}>{players.length} online</span>
      </div>

      {/* Message List */}
      <div style={S.list} ref={listRef} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={S.empty}>no messages yet — say hi! 👋</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={msg.type === "system" ? S.sysMsg : S.chatMsg}>
            {msg.type === "system" ? (
              <span style={S.sysMsgText}>— {msg.text} —</span>
            ) : (
              <>
                <div style={S.msgMeta}>
                  <span style={{
                    ...S.msgName,
                    color: getPlayerColor(msg.playerId, players),
                  }}>
                    {msg.playerId === socketId ? "you" : msg.playerName}
                  </span>
                  <span style={S.msgTime}>{formatTime(msg.ts)}</span>
                </div>
                <div style={{
                  ...S.msgBubble,
                  background: msg.playerId === socketId
                    ? "rgba(240,192,64,0.12)"
                    : "var(--surface2)",
                  borderColor: msg.playerId === socketId
                    ? "rgba(240,192,64,0.2)"
                    : "var(--border)",
                }}>
                  {msg.text}
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom hint */}
      {!autoScroll && (
        <button style={S.scrollBtn} onClick={() => {
          setAutoScroll(true);
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }}>
          ↓ new messages
        </button>
      )}

      {/* Input */}
      <div style={S.inputRow}>
        <input
          style={S.input}
          placeholder={disabled ? "join a room to chat" : "type a message..."}
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 200))}
          onKeyDown={handleKey}
          disabled={disabled}
          maxLength={200}
        />
        <button
          style={{ ...S.sendBtn, opacity: (!input.trim() || disabled) ? 0.4 : 1 }}
          onClick={send}
          disabled={!input.trim() || disabled}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    width: 270,
    minWidth: 270,
    maxWidth: 270,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
    borderLeft: "1px solid var(--border)",
    fontFamily: "var(--mono)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 16px 12px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  headerDot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "var(--green)",
    boxShadow: "0 0 6px var(--green)",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text2)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    flex: 1,
  },
  headerCount: {
    fontSize: 11,
    color: "var(--muted)",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    scrollbarWidth: "thin",
  },
  empty: {
    color: "var(--muted)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 1.6,
  },
  sysMsg: {
    display: "flex",
    justifyContent: "center",
    padding: "2px 0",
  },
  sysMsgText: {
    fontSize: 11,
    color: "var(--muted)",
    fontStyle: "italic",
    letterSpacing: "0.02em",
  },
  chatMsg: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  msgMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  msgName: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  msgTime: {
    fontSize: 10,
    color: "var(--muted)",
    marginLeft: "auto",
  },
  msgBubble: {
    fontSize: 13,
    lineHeight: 1.5,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid",
    color: "var(--text)",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  scrollBtn: {
    margin: "0 12px 4px",
    padding: "5px 10px",
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--mono)",
    flexShrink: 0,
  },
  inputRow: {
    display: "flex",
    gap: 6,
    padding: "10px 12px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    color: "var(--text)",
    fontFamily: "var(--mono)",
    minWidth: 0,
  },
  sendBtn: {
    width: 34,
    height: 34,
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
};