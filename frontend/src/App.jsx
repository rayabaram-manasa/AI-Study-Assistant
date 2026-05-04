import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      setSidebarOpen(false); // close sidebar on mobile after upload
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
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0f1117;
          color: #e2e8f0;
          height: 100dvh;
          overflow: hidden;
        }

        .app-root {
          display: flex;
          height: 100dvh;
          overflow: hidden;
          position: relative;
        }

        /* ── OVERLAY (mobile) ── */
        .overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 40;
        }
        .overlay.open { display: block; }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: #1a1d27;
          border-right: 1px solid #2d3148;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 50;
          transition: transform 0.3s ease;
        }

        /* ── HAMBURGER (mobile only) ── */
        .hamburger {
          display: none;
          background: none;
          border: none;
          color: #e2e8f0;
          font-size: 22px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .hamburger:hover { background: #1a1d27; }

        /* ── MAIN ── */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .header {
          padding: 14px 20px;
          border-bottom: 1px solid #1e2235;
          background: #0f1117;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .header-title { font-size: 16px; font-weight: 600; color: #e2e8f0; white-space: nowrap; }
        .header-sub { font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .status-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.3s;
        }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .empty-state {
          margin: auto;
          text-align: center;
          max-width: 420px;
          padding: 24px 16px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-title {
          font-size: 22px; font-weight: 700;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        .empty-sub {
          font-size: 14px; color: #64748b;
          line-height: 1.7; margin-bottom: 20px;
        }
        .empty-steps {
          display: flex; flex-direction: column; gap: 10px;
          text-align: left;
        }
        .empty-step {
          display: flex; align-items: flex-start; gap: 12px;
          background: #1a1d27;
          border: 1px solid #2d3148;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .step-num {
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .step-text { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .step-text strong { color: #cbd5e1; display: block; margin-bottom: 2px; }

        .msg-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.ai, .msg-row.system { justify-content: flex-start; }

        .ai-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #1a1d27;
          border: 1px solid #2d3148;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        .bubble {
          max-width: 72%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
          word-break: break-word;
        }
        .bubble.user {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .bubble.ai {
          background: #1a1d27;
          border: 1px solid #2d3148;
          color: #cbd5e1;
          border-bottom-left-radius: 4px;
        }
        .bubble.system {
          background: #0f1e15;
          border: 1px solid #166534;
          color: #86efac;
          border-bottom-left-radius: 4px;
          font-style: italic;
          font-size: 13px;
        }

        .typing { color: #818cf8; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .dots { animation: blink 1.2s step-end infinite; }

        .input-area {
          padding: 10px 16px 6px;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          border-top: 1px solid #1e2235;
          background: #0f1117;
          flex-shrink: 0;
        }

        textarea {
          flex: 1;
          background: #1a1d27;
          border: 1px solid #2d3148;
          border-radius: 10px;
          padding: 10px 14px;
          color: #e2e8f0;
          font-size: 14px;
          resize: none;
          outline: none;
          font-family: inherit;
          line-height: 1.5;
          min-height: 42px;
          max-height: 120px;
        }
        textarea:focus { border-color: #6366f1; }

        .send-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 10px;
          width: 42px; height: 42px;
          font-size: 18px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .send-btn:disabled {
          background: #1e2235;
          color: #334155;
          cursor: not-allowed;
        }

        .hint {
          font-size: 11px;
          color: #334155;
          text-align: center;
          padding: 4px 0 10px;
        }

        /* ── SIDEBAR INTERNALS ── */
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .logo-icon { font-size: 22px; }
        .logo-text {
          font-size: 20px; font-weight: 700;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-label {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #64748b;
        }

        .drop-zone {
          border: 2px dashed #2d3148;
          border-radius: 10px;
          padding: 20px 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #12141e;
        }
        .drop-zone.active { border-color: #818cf8; background: #1a1b2e; }
        .drop-zone.done { border-color: #22c55e; background: #0f1e15; }

        .upload-icon { font-size: 24px; color: #475569; }
        .drop-text { font-size: 13px; color: #94a3b8; margin: 6px 0 2px; }
        .drop-sub { font-size: 11px; color: #475569; }
        .file-icon { font-size: 26px; }
        .file-name { font-size: 12px; color: #cbd5e1; margin: 6px 0 2px; word-break: break-all; }
        .file-size { font-size: 11px; color: #475569; }

        .upload-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; border: none; border-radius: 8px;
          padding: 10px 0; font-weight: 600; font-size: 13px;
          cursor: pointer; width: 100%;
        }
        .upload-btn:disabled {
          background: #1e2235; color: #475569; cursor: not-allowed;
        }

        .reset-btn {
          background: transparent; color: #64748b;
          border: 1px solid #2d3148; border-radius: 8px;
          padding: 8px 0; font-size: 12px; cursor: pointer; width: 100%;
        }

        .tip-box {
          margin-top: auto;
          background: #12141e;
          border: 1px solid #2d3148;
          border-radius: 8px;
          padding: 12px;
        }
        .tip-title { font-size: 11px; font-weight: 600; color: #818cf8; margin-bottom: 4px; }
        .tip-text { font-size: 11px; color: #64748b; line-height: 1.5; }

        /* ── MOBILE BREAKPOINT ── */
        @media (max-width: 640px) {
          .hamburger { display: flex; align-items: center; }

          .sidebar {
            position: fixed;
            top: 0; left: 0;
            height: 100dvh;
            transform: translateX(-100%);
          }
          .sidebar.open { transform: translateX(0); }

          .bubble { max-width: 85%; font-size: 13px; }

          .header-title { font-size: 14px; }
          .header-sub { display: none; }

          .chat-area { padding: 14px; gap: 12px; }

          .hint { display: none; }

          .input-area { padding: 8px 12px 10px; }
        }
      `}</style>

      <div className="app-root">

        {/* Mobile overlay */}
        <div
          className={`overlay ${sidebarOpen ? "open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">StudyAI</span>
          </div>

          <p className="sidebar-label">Upload Document</p>

          <div
            className={`drop-zone ${dragOver ? "active" : ""} ${uploaded ? "done" : ""}`}
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
                <div className="file-icon">{uploaded ? "✅" : "📄"}</div>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <div className="upload-icon">⬆</div>
                <p className="drop-text">Drop PDF here</p>
                <p className="drop-sub">or click to browse</p>
              </>
            )}
          </div>

          <button
            className="upload-btn"
            onClick={uploadFile}
            disabled={uploading || !file || uploaded}
          >
            {uploading ? "Processing..." : uploaded ? "✓ Ready" : "Upload & Process"}
          </button>

          {uploaded && (
            <button
              className="reset-btn"
              onClick={() => {
                setFile(null);
                setUploaded(false);
                setMessages([]);
              }}
            >
              Upload new file
            </button>
          )}

          <div className="tip-box">
            <p className="tip-title">Tips</p>
            <p className="tip-text">Ask specific questions like "What is RAG?" or "Summarize phase 5"</p>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="header">
            <div className="header-left">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <div className="header-title">AI Study Assistant</div>
                <div className="header-sub">Powered by RAG — answers from your documents only</div>
              </div>
            </div>
            <div className="status-dot" style={{ background: uploaded ? "#22c55e" : "#94a3b8" }} />
          </header>

          <div className="chat-area">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <div className="empty-title">Welcome to AI Study Assistant</div>
                <div className="empty-sub">
                  Upload any PDF and instantly get answers from it.<br/>
                  No unrelated information — only what's in your document.
                </div>
                <div className="empty-steps">
                  <div className="empty-step">
                    <div className="step-num">1</div>
                    <div className="step-text">
                      <strong>Upload your PDF</strong>
                      Click the menu (☰) and drop or select your study material
                    </div>
                  </div>
                  <div className="empty-step">
                    <div className="step-num">2</div>
                    <div className="step-text">
                      <strong>Ask any question</strong>
                      Type your question below and hit Enter
                    </div>
                  </div>
                  <div className="empty-step">
                    <div className="step-num">3</div>
                    <div className="step-text">
                      <strong>Get precise answers</strong>
                      Answers come only from your uploaded document
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  {msg.role !== "user" && (
                    <div className="ai-avatar">{msg.role === "system" ? "ℹ" : "🤖"}</div>
                  )}
                  <div className={`bubble ${msg.role}`}>{msg.text}</div>
                </div>
              ))
            )}
            {loading && (
              <div className="msg-row ai">
                <div className="ai-avatar">🤖</div>
                <div className="bubble ai">
                  <span className="typing">Thinking<span className="dots">...</span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <textarea
              placeholder={uploaded ? "Ask a question about your document..." : "Upload a PDF first to start asking questions"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!uploaded || loading}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={askQuestion}
              disabled={!question.trim() || loading || !uploaded}
            >
              ➤
            </button>
          </div>
          <p className="hint">Press Enter to send · Shift+Enter for new line</p>
        </main>
      </div>
    </>
  );
}