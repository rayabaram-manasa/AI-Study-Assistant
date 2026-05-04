import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (f) => {
    if (f && f.type === "application/pdf") {
      setFile(f);
      setUploaded(false);
    } else {
      alert("Please select a PDF file.");
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/upload`, formData);
      setUploaded(true);
      setMessages([
        {
          role: "system",
          text: `"${file.name}" uploaded. Ask me anything about it!`,
        },
      ]);
    } catch {
      alert("Upload failed. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    if (!uploaded) {
      alert("Please upload a PDF first.");
      return;
    }

    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/query`, { q: question });
      const answer = res.data.answer || res.data.error || "No answer returned.";
      setMessages((prev) => [...prev, { role: "ai", text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📚</span>
          <span style={styles.logoText}>StudyAI</span>
        </div>

        <p style={styles.sidebarLabel}>Upload Document</p>

        <div
          style={{
            ...styles.dropZone,
            ...(dragOver ? styles.dropZoneActive : {}),
            ...(uploaded ? styles.dropZoneDone : {}),
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFileChange(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          {file ? (
            <>
              <span style={styles.fileIcon}>{uploaded ? "✅" : "📄"}</span>
              <p style={styles.fileName}>{file.name}</p>
              <p style={styles.fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <span style={styles.uploadIcon}>⬆</span>
              <p style={styles.dropText}>Drop PDF here</p>
              <p style={styles.dropSubText}>or click to browse</p>
            </>
          )}
        </div>

        <button
          style={{
            ...styles.uploadBtn,
            ...(uploading || !file || uploaded ? styles.uploadBtnDisabled : {}),
          }}
          onClick={uploadFile}
          disabled={uploading || !file || uploaded}
        >
          {uploading ? "Processing..." : uploaded ? "✓ Ready" : "Upload & Process"}
        </button>

        {uploaded && (
          <button
            style={styles.resetBtn}
            onClick={() => {
              setFile(null);
              setUploaded(false);
              setMessages([]);
            }}
          >
            Upload new file
          </button>
        )}

        <div style={styles.tipBox}>
          <p style={styles.tipTitle}>Tips</p>
          <p style={styles.tipText}>Ask specific questions like "What is RAG?" or "Summarize phase 5"</p>
        </div>
      </aside>

      {/* Main Chat */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>AI Study Assistant</h1>
            <p style={styles.headerSub}>Powered by RAG — answers from your documents only</p>
          </div>
          <div style={{ ...styles.statusDot, background: uploaded ? "#22c55e" : "#94a3b8" }} />
        </header>

        <div style={styles.chatArea}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>💬</p>
              <p style={styles.emptyTitle}>No conversation yet</p>
              <p style={styles.emptySub}>Upload a PDF and start asking questions</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role !== "user" && (
                  <div style={styles.aiAvatar}>{msg.role === "system" ? "ℹ" : "🤖"}</div>
                )}
                <div
                  style={{
                    ...styles.bubble,
                    ...(msg.role === "user" ? styles.userBubble : msg.role === "system" ? styles.systemBubble : styles.aiBubble),
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
              <div style={styles.aiAvatar}>🤖</div>
              <div style={{ ...styles.bubble, ...styles.aiBubble }}>
                <span style={styles.typing}>Thinking<span style={styles.dots}>...</span></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            placeholder={uploaded ? "Ask a question about your document..." : "Upload a PDF first to start asking questions"}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!uploaded || loading}
            rows={1}
          />
          <button
            style={{
              ...styles.sendBtn,
              ...(!question.trim() || loading || !uploaded ? styles.sendBtnDisabled : {}),
            }}
            onClick={askQuestion}
            disabled={!question.trim() || loading || !uploaded}
          >
            ➤
          </button>
        </div>
        <p style={styles.hint}>Press Enter to send · Shift+Enter for new line</p>
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: "#0f1117",
    color: "#e2e8f0",
    overflow: "hidden",
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "#1a1d27",
    borderRight: "1px solid #2d3148",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  logoIcon: { fontSize: 22 },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    background: "linear-gradient(135deg, #818cf8, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sidebarLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
    margin: 0,
  },
  dropZone: {
    border: "2px dashed #2d3148",
    borderRadius: 10,
    padding: "20px 12px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#12141e",
  },
  dropZoneActive: {
    border: "2px dashed #818cf8",
    background: "#1a1b2e",
  },
  dropZoneDone: {
    border: "2px dashed #22c55e",
    background: "#0f1e15",
  },
  uploadIcon: { fontSize: 24, color: "#475569" },
  dropText: { fontSize: 13, color: "#94a3b8", margin: "6px 0 2px" },
  dropSubText: { fontSize: 11, color: "#475569", margin: 0 },
  fileIcon: { fontSize: 26 },
  fileName: { fontSize: 12, color: "#cbd5e1", margin: "6px 0 2px", wordBreak: "break-all" },
  fileSize: { fontSize: 11, color: "#475569", margin: 0 },
  uploadBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
  },
  uploadBtnDisabled: {
    background: "#1e2235",
    color: "#475569",
    cursor: "not-allowed",
  },
  resetBtn: {
    background: "transparent",
    color: "#64748b",
    border: "1px solid #2d3148",
    borderRadius: 8,
    padding: "8px 0",
    fontSize: 12,
    cursor: "pointer",
    width: "100%",
  },
  tipBox: {
    marginTop: "auto",
    background: "#12141e",
    border: "1px solid #2d3148",
    borderRadius: 8,
    padding: "12px",
  },
  tipTitle: { fontSize: 11, fontWeight: 600, color: "#818cf8", margin: "0 0 4px" },
  tipText: { fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.5 },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #1e2235",
    background: "#0f1117",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { margin: 0, fontSize: 17, fontWeight: 600, color: "#e2e8f0" },
  headerSub: { margin: "2px 0 0", fontSize: 12, color: "#475569" },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    transition: "background 0.3s",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  emptyState: {
    margin: "auto",
    textAlign: "center",
    color: "#334155",
  },
  emptyIcon: { fontSize: 40, margin: "0 0 12px" },
  emptyTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "#475569" },
  emptySub: { fontSize: 13, margin: 0, color: "#334155" },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#1a1d27",
    border: "1px solid #2d3148",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "72%",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.6,
  },
  userBubble: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    background: "#1a1d27",
    border: "1px solid #2d3148",
    color: "#cbd5e1",
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    background: "#0f1e15",
    border: "1px solid #166534",
    color: "#86efac",
    borderBottomLeftRadius: 4,
    fontStyle: "italic",
    fontSize: 13,
  },
  typing: { color: "#818cf8" },
  dots: { animation: "blink 1.2s step-end infinite" },
  inputArea: {
    padding: "12px 24px 6px",
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
    borderTop: "1px solid #1e2235",
    background: "#0f1117",
  },
  textarea: {
    flex: 1,
    background: "#1a1d27",
    border: "1px solid #2d3148",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#e2e8f0",
    fontSize: 14,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  sendBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    width: 42,
    height: 42,
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    background: "#1e2235",
    color: "#334155",
    cursor: "not-allowed",
  },
  hint: {
    fontSize: 11,
    color: "#334155",
    textAlign: "center",
    padding: "4px 0 12px",
    margin: 0,
  },
};