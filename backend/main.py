from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
from PyPDF2 import PdfReader
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# ── CONFIG ─────────────────────────────────────────────────────────────────
load_dotenv()
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise RuntimeError("API_KEY not found in .env file!")

# ── EMBEDDING MODEL ─────────────────────────────────────────────────────────
print("Loading embedding model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Ready!")

# ── STORAGE ─────────────────────────────────────────────────────────────────
stored_chunks: list[str] = []
stored_embeddings: list[list[float]] = []

# ── APP ─────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    q: str

# ── HELPERS ─────────────────────────────────────────────────────────────────
def chunk_text(text: str, chunk_size=800, overlap=150) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks

def cosine_similarity(a, b) -> float:
    a, b = np.array(a), np.array(b)
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    return float(np.dot(a, b) / (na * nb)) if na and nb else 0.0

def needs_full_document(q: str) -> bool:
    keywords = [
        "how many", "list all", "all phases", "every phase",
        "complete list", "all sections", "how many phases",
        "summarize", "summarise", "summary", "overview",
        "what is this file", "what is this about",
        "tell me about this", "what does this file",
        "what are the", "all the", "entire", "whole"
    ]
    return any(k in q.lower() for k in keywords)

async def ask_groq(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful study assistant. "
                            "Answer questions using ONLY the provided context. "
                            "Be clear, specific and detailed. "
                            "If the answer is not in the context, say "
                            "'This information is not in the document.'"
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 1024,
                "temperature": 0.2,
            }
        )
    data = res.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        error_msg = data.get("error", {}).get("message", "Unknown error")
        return f"API error: {error_msg}"

# ── ROUTES ───────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "Backend is running!"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global stored_chunks, stored_embeddings

    os.makedirs("uploads", exist_ok=True)
    path = os.path.join("uploads", file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())

    reader = PdfReader(path)
    text = "".join(p.extract_text() or "" for p in reader.pages)

    if not text.strip():
        return {"error": "Could not extract text. PDF may be image-based."}

    stored_chunks = chunk_text(text)
    stored_embeddings = embedding_model.encode(stored_chunks).tolist()

    return {"message": f"Uploaded! Processed {len(stored_chunks)} chunks."}


@app.post("/query")
async def query(req: QueryRequest):
    if not stored_embeddings:
        return {"error": "Upload a document first"}

    q = req.q.strip()

    if needs_full_document(q):
        # Send entire document for broad questions like "list all phases"
        context = "\n\n".join(stored_chunks)
    else:
        # RAG: top 6 most relevant chunks for specific questions
        q_emb = embedding_model.encode([q])[0].tolist()
        sims = [cosine_similarity(q_emb, e) for e in stored_embeddings]
        top = np.argsort(sims)[-6:][::-1]
        context = "\n\n".join(stored_chunks[i] for i in top)[:6000]

    prompt = (
        f"Context from the document:\n{context}\n\n"
        f"Question: {q}"
    )

    answer = await ask_groq(prompt)
    return {"answer": answer}