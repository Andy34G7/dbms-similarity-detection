#!/bin/bash
set -e

# ==============================================================================
# Automated Test Evaluation & Vector Similarity System
# Startup Script
# Section / Team: PES2UG24CS058 & PES2UG24CS061
# ==============================================================================

echo "================================================================="
echo "   AutoEval & Vector Similarity System - Starting Services       "
echo "================================================================="

# 1. Check / Start Docker PostgreSQL 16 + pgvector container
echo "[1/4] Checking PostgreSQL 16 with pgvector on port 5433..."
if ! docker ps | grep -q "postgres-exam-lab"; then
    echo "  Starting postgres-exam-lab container..."
    docker compose up -d
    sleep 3
else
    echo "  PostgreSQL container is already running."
fi

# 2. Run Database Migrations & Seed if needed
echo "[2/4] Ensuring database schema and seeds are loaded..."
if command -v psql >/dev/null 2>&1; then
    PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/01_schema.sql >/dev/null 2>&1 || true
    PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/02_triggers_procedures.sql >/dev/null 2>&1 || true
    PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/03_views.sql >/dev/null 2>&1 || true
    PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/04_seed.sql >/dev/null 2>&1 || true
else
    docker exec -i postgres-exam-lab psql -U postgres -d exam_eval_db < database/01_schema.sql >/dev/null 2>&1 || true
    docker exec -i postgres-exam-lab psql -U postgres -d exam_eval_db < database/02_triggers_procedures.sql >/dev/null 2>&1 || true
    docker exec -i postgres-exam-lab psql -U postgres -d exam_eval_db < database/03_views.sql >/dev/null 2>&1 || true
    docker exec -i postgres-exam-lab psql -U postgres -d exam_eval_db < database/04_seed.sql >/dev/null 2>&1 || true
fi
echo "  Database ready."

# 3. Start Python FastAPI Backend
echo "[3/4] Starting FastAPI backend on http://localhost:8000..."
cd backend
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 4. Start Next.js Frontend
echo "[4/4] Starting Next.js frontend on http://localhost:3000..."
cd frontend
bun run dev --port 3000 &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================================================="
echo "   All Services Running!                                         "
echo "   - Frontend UI:        http://localhost:3000                   "
echo "   - FastAPI Swagger UI: http://localhost:8000/docs              "
echo "   - PostgreSQL:         localhost:5433 (exam_eval_db)           "
echo "================================================================="
echo "Press Ctrl+C to terminate all services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
