# 📚 AI Study Assistant — RAG Application

An intelligent full-stack study assistant that lets you upload PDF documents and ask questions about them. All answers are derived strictly from your uploaded documents using **Retrieval-Augmented Generation (RAG)**.

---

## 🧠 How It Works

```
PDF Upload → 
Text Extraction → 
Chunking → 
Embedding (local)
                                                ↓
User Question → 
Embed Question → 
Cosine Similarity Search
Top Relevant Chunks → 
Groq LLaMA 3.3 → Answer
```

1. **Upload** — PDF is parsed and split into overlapping chunks
2. **Embed** — Each chunk is converted to a vector using `all-MiniLM-L6-v2` (runs locally)
3. **Search** — User question is embedded and compared against all chunks using cosine similarity
4. **Answer** — Top matching chunks are sent to Groq's LLaMA 3.3 70B model as context
5. **Display** — Answer is shown in the chat interface

---

## 🗂️ Project Structure

```
AI study assistant/
│
├── backend/
│   ├── main.py           # FastAPI backend — all RAG logic
│   ├── run.py            # Server launcher (no reload issues)
│   ├── .env              # API keys (never commit this)
│   ├── .gitignore        # Ignores .env, uploads/, venv/
│   ├── requirements.txt  # Python dependencies
│   └── uploads/          # Uploaded PDFs stored here (auto-created)
│
└── frontend/
    └── src/
        └── App.jsx       # React chat interface
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI (Python) |
| PDF Parsing | PyPDF2 |
| Embedding Model | sentence-transformers `all-MiniLM-L6-v2` (local) |
| Vector Search | Cosine Similarity (NumPy) |
| LLM | Groq — `llama-3.3-70b-versatile` (free API) |
| HTTP Client | httpx (async) |

---

## 🚀 How to Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

---

### 1. Clone / Download the project

```bash
cd "AI study assistant"
```

---

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Configure API Key

Create a `.env` file inside the `backend/` folder:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get your free key at → [console.groq.com](https://console.groq.com)
- Sign up → API Keys → Create API Key
- No credit card required
- 14,400 free requests/day

---

### 4. Start the Backend

```bash
python run.py
```

You should see:
```
Loading embedding model...
Ready!
INFO: Uvicorn running on http://127.0.0.1:8000
```

---

### 5. Frontend Setup

Open a **new terminal**:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open your browser at → `http://localhost:5173`

---

## 💬 Usage

1. Click **"Upload PDF"** and select your study document
2. Wait for **"Uploaded!"** confirmation
3. Type any question in the chat input
4. Press **Enter** or click the send button
5. Get an accurate answer derived from your document

### Example Questions
- *"What is this file about?"*
- *"Summarize the document"*
- *"How many phases are there?"*
- *"What is RAG?"*
- *"What technology is used in the frontend?"*
- *"Explain Phase 6 in detail"*

---

## 🔑 Environment Variables

| Variable | Description | Where to get |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM API key | [console.groq.com](https://console.groq.com) |

---

## 📦 requirements.txt

```
fastapi
uvicorn[standard]
python-multipart
PyPDF2
numpy
sentence-transformers
httpx
python-dotenv
```

Install all with:
```bash
pip install -r requirements.txt
```

---

## ⚠️ Important Notes

- **Never commit `.env`** to GitHub — it's listed in `.gitignore`
- The embedding model (`all-MiniLM-L6-v2`) downloads **~90MB** on first run and is cached
- Each query takes **1–3 seconds** (Groq is very fast)
- Supports **any text-based PDF** — scanned/image PDFs won't work
- Document stays in memory — re-upload after restarting the server

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `GROQ_API_KEY not found` | Make sure `.env` file exists in `backend/` folder |
| `Upload failed` | Check backend is running on port 8000 |
| WatchFiles warnings | Use `python run.py` not `uvicorn main:app --reload` |
| `Model decommissioned` error | Update model name in `main.py` to latest at [console.groq.com/docs](https://console.groq.com/docs) |
| Incomplete answers | Document is too large — the full doc mode handles up to 128k tokens |

---

## 🏗️ Architecture — RAG Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  PDF Upload │────▶│ Text Extract │────▶│   Chunking    │
└─────────────┘     └──────────────┘     │ (800 chars,   │
                                         │  150 overlap) │
                                         └───────┬───────┘
                                                 │
                                         ┌───────▼───────┐
                                         │   Embedding   │
                                         │ (MiniLM-L6-v2)│
                                         └───────┬───────┘
                                                 │
┌─────────────┐     ┌──────────────┐     ┌───────▼───────┐
│User Question│────▶│Embed Question│────▶│Cosine Sim     │
└─────────────┘     └──────────────┘     │Search → Top 6 │
                                         └───────┬───────┘
                                                 │
                                         ┌───────▼───────┐
                                         │  Groq LLaMA   │
                                         │  3.3 70B      │
                                         └───────┬───────┘
                                                 │
                                         ┌───────▼───────┐
                                         │    Answer     │
                                         └───────────────┘
```

---
