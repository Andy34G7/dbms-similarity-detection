import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import init_db_pool, close_db_pool
from services.embedding_service import embedding_service
from services.evaluation_service import evaluation_service
from routers import tests, submissions, evaluation, showcase

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print("[+] Initializing database connection pool...")
    init_db_pool()
    print("[+] Ensuring sentence embedding model is warm...")
    _ = embedding_service.encode("Warmup query")
    print("[+] Syncing embeddings for seed/unprocessed answers...")
    count = embedding_service.sync_missing_embeddings()
    print(f"[+] Synchronized {count} missing embeddings.")

    # Run initial evaluation on existing seed submissions
    try:
        from db import get_db_cursor
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("SELECT submission_id FROM SUBMISSION WHERE student_id != 'REF_BENCHMARK';")
            subs = [s["submission_id"] for s in cursor.fetchall()]
            
            cursor.execute("SELECT question_id FROM QUESTION;")
            qs = [q["question_id"] for q in cursor.fetchall()]
            
        for sub_id in subs:
            evaluation_service.evaluate_submission(sub_id)
        for q_id in qs:
            evaluation_service.compute_pairwise_plagiarism(q_id)
        print("[+] Initial evaluations and plagiarism matrices computed.")
    except Exception as e:
        print(f"[!] Warning during initial evaluation: {e}")

    yield

    # Shutdown actions
    print("[-] Closing database connection pool...")
    close_db_pool()

app = FastAPI(
    title="Automated Test Evaluation & Vector Similarity System",
    description="PES University DBMS Level 3 Project API (PostgreSQL 16 + pgvector & Sentence-Transformers)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tests.router)
app.include_router(submissions.router)
app.include_router(evaluation.router)
app.include_router(showcase.router)

@app.get("/health")
@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Automated Test Evaluation & Vector Similarity System API",
        "database": "PostgreSQL 16 with pgvector",
        "embedding_model": "all-MiniLM-L6-v2 (384-d)",
        "team_srns": ["PES2UG24CS058", "PES2UG24CS061"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
