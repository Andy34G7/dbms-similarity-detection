# Automated Test Evaluation & Vector Similarity System

> **PES University - Department of Computer Science & Engineering**  
> **Course:** Database Management Systems (DBMS Experiential Learning - Level 3 Project)  
> **Team Members:**  
> - **Ananya Ratnaparkhi** - `PES2UG24CS058`  
> - **Hemanth Andey** - `PES2UG24CS061`  
> **Database:** PostgreSQL 16 with `pgvector` Extension  
> **Architecture:** Next.js Fullstack UI + Python FastAPI Vector Microservice + PostgreSQL 16

---

## 1. Problem Statement & Motivation

Subjective and descriptive questions in technical examinations (e.g., explaining database isolation levels, B+ tree mechanics, normal forms) are challenging and labor-intensive to grade manually. Traditional automated grading tools rely on rigid keyword matching or exact regular expressions, which fail to recognize valid student answers expressed with alternative technical terminology, paraphrasing, or varying sentence structures.

Furthermore, academic dishonesty and collusion detection across descriptive answers is virtually impossible with simple keyword lookups because students rephrase identical conceptual answers.

**Our Solution:**  
This project implements an **Automated Test Evaluation and Vector Similarity System** utilizing a dual-paradigm database architecture combining relational SQL with dense vector embeddings via PostgreSQL and the `pgvector` extension. The system achieves two vital objectives:
1. **Student vs. Teacher Benchmark Evaluation:** Automatically computes semantic similarity between a student's answer and the teacher's gold-standard model key using dense 384-dimensional embeddings (`sentence-transformers/all-MiniLM-L6-v2`), awarding grades dynamically through stored procedures and reactive triggers.
2. **Student vs. Student Pairwise Plagiarism & Collusion Detection:** Performs an $N \times N$ cross-comparison across all student submissions for every question, rendering an interactive collusion heatmap matrix that highlights suspicious clusters and identical conceptual submissions.

---

## 2. System Architecture

```
                                 ┌─────────────────────────────────────────┐
                                 │       Next.js 15+ Web Application       │
                                 │   - One-Click Persona Role Switcher     │
                                 │   - Teacher Console & Test Creator      │
                                 │   - Student Subjective Test Workspace   │
                                 │   - Pairwise Plagiarism Heatmap Grid    │
                                 │   - DBMS Showcase Panel (Viva Ready)    │
                                 └────────────────────┬────────────────────┘
                                                      │ REST HTTP (JSON)
                                                      ▼
                                 ┌─────────────────────────────────────────┐
                                 │       Python FastAPI Vector Backend     │
                                 │   - sentence-transformers/all-MiniLM-L6-v2
                                 │   - 384-Dimensional Dense Vectorization │
                                 │   - Cosine Distance Computation (<=>)   │
                                 │   - Connection Pool to PostgreSQL       │
                                 └────────────────────┬────────────────────┘
                                                      │ SQL / pgvector
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL 16 + pgvector Database Engine                        │
│                                                                                        │
│  Relational Entities:                                                                 │
│  ├── TEACHER (teacher_id, name, email, dept_name, created_at)                          │
│  ├── TEST (test_id, teacher_id, title, description, created_at)                        │
│  ├── QUESTION (question_id, test_id, question_text, marks, sample_solution)            │
│  ├── STUDENT (student_id, name, email, created_at)                                     │
│  ├── SUBMISSION (submission_id, student_id, test_id, submitted_at, status, total_score)│
│  ├── ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded)        │
│  ├── ANSWER_EMBEDDING (embedding_id, answer_id, embedding vector(384), model_name)    │
│  ├── SIMILARITY_RESULT (result_id, embedding_id, compared_answer_id, similarity_score) │
│  └── AUDIT_LOG (log_id, entity_name, record_id, action_type, old_val, new_val, time)  │
│                                                                                        │
│  Advanced DB Features:                                                                 │
│  ├── HNSW Vector Index: idx_embedding_vector_hnsw (vector_cosine_ops)                   │
│  ├── Triggers: trg_recalculate_submission_score & trg_audit_answer_score               │
│  ├── Stored Procedures: sp_evaluate_submission & sp_ensure_benchmark_submission        │
│  └── Relational Views: v_test_details, v_student_submission_summary,                   │
│                       v_similarity_evaluation, v_plagiarism_matrix                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Design & Relational Mapping

### 3.1 Relational Schema Representation
- **`TEACHER`** (<ins>`teacher_id`</ins>, `name`, `email`, `dept_name`, `created_at`)
- **`TEST`** (<ins>`test_id`</ins>, `#teacher_id`, `title`, `description`, `created_at`)
- **`QUESTION`** (<ins>`question_id`</ins>, `#test_id`, `question_text`, `marks`, `sample_solution`, `created_at`)
- **`STUDENT`** (<ins>`student_id`</ins>, `name`, `email`, `created_at`)
- **`SUBMISSION`** (<ins>`submission_id`</ins>, `#student_id`, `#test_id`, `submitted_at`, `status`, `total_score`)
- **`ANSWER`** (<ins>`answer_id`</ins>, `#submission_id`, `#question_id`, `answer_text`, `marks_awarded`, `is_reference`, `created_at`)
- **`ANSWER_EMBEDDING`** (<ins>`embedding_id`</ins>, `#answer_id`, `embedding vector(384)`, `model_name`, `created_at`)
- **`SIMILARITY_RESULT`** (<ins>`result_id`, `#embedding_id`</ins>, `#compared_answer_id`, `similarity_score`, `comparison_type`, `evaluated_at`)
- **`AUDIT_LOG`** (<ins>`log_id`</ins>, `entity_name`, `record_id`, `action_type`, `old_val`, `new_val`, `performed_by`, `log_time`)

### 3.2 ER Mapping & Constraints
- **Strong Entities:** `TEACHER`, `TEST`, `QUESTION`, `STUDENT`, `SUBMISSION`, `ANSWER`, `ANSWER_EMBEDDING`.
- **Weak Entity:** `SIMILARITY_RESULT` is an identifying weak entity dependent on `ANSWER_EMBEDDING`, forming the composite primary key `(result_id, embedding_id)`.
- **1:1 Relationship:** `ANSWER` $\to$ `ANSWER_EMBEDDING` via `UNIQUE(answer_id)` constraint.
- **Constraints:**
  - Foreign key cascading: `ON DELETE CASCADE ON UPDATE CASCADE`.
  - Integrity Check: `chk_similarity_score CHECK (similarity_score >= 0.0000 AND similarity_score <= 1.0000)`.
  - Email Validation: `chk_teacher_email` and `chk_student_email` enforcing RFC email format.
  - Score bounds: `marks > 0` on questions and `marks_awarded >= 0` on answers.

---

## 4. Advanced Database Features Demonstrated

| Advanced Concept | Implementation in this System |
|---|---|
| **1. Vector Similarity Search** | Utilizes `pgvector` with cosine distance operator `<=>` ($1 - (\vec{u} \cdot \vec{v})$) to evaluate student semantic alignment with teacher benchmarks and detect collusion. |
| **2. Indexing (B-Tree + HNSW)** | B-Tree indexes on all foreign key join targets; **HNSW (Hierarchical Navigable Small World)** vector index on `ANSWER_EMBEDDING(embedding vector_cosine_ops)` for logarithmic vector similarity search. |
| **3. Reactive Triggers** | `trg_recalculate_submission_score` automatically aggregates `SUM(marks_awarded)` and updates `SUBMISSION.total_score` and status upon any answer update. `trg_audit_answer_score` logs all mark modifications into `AUDIT_LOG`. |
| **4. Stored Procedures** | `sp_evaluate_submission(submission_id, thresh_full, thresh_partial)` iterates through answers, computes grade tiers based on cosine score, and commits updates in an atomic transaction. |
| **5. Relational Views** | `v_test_details`, `v_student_submission_summary`, `v_similarity_evaluation`, and `v_plagiarism_matrix` synthesizing complex multi-way joins, subqueries, and aggregates. |
| **6. Transactions** | Multi-table atomic test authoring and submission commits ensuring ACID compliance (`BEGIN ... COMMIT / ROLLBACK`). |

---

## 5. Quick Start & Execution Guide

### Prerequisites
- **Docker** and Docker Compose
- **Node.js** (v18+) or **Bun** (v1.1+)
- **Python** (3.11 or 3.12) with `uv` (or standard virtualenv)
- PostgreSQL client (`psql`)

### Step 1: Start PostgreSQL with pgvector
```bash
docker compose up -d
```
*PostgreSQL 16 runs on port `5433` (database: `exam_eval_db`, user: `postgres`, password: `password`).*

### Step 2: Initialize Database Schema & Seed Data
```bash
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/01_schema.sql
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/02_triggers_procedures.sql
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/03_views.sql
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d exam_eval_db -f database/04_seed.sql
```

### Step 3: Start Python FastAPI Backend
```bash
cd backend
# Create virtual environment and install dependencies
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -r requirements.txt # Or uv pip install torch --index-url https://download.pytorch.org/whl/cpu && uv pip install sentence-transformers fastapi uvicorn psycopg2-binary numpy pydantic python-dotenv pytest httpx

# Run FastAPI server on port 8000
python main.py
```
*FastAPI documentation is available at `http://localhost:8000/docs`.*

### Step 4: Start Next.js Frontend
```bash
cd frontend
bun install  # or npm install
bun run dev  # or npm run dev
```
*Access the Web Application at `http://localhost:3000`.*

### Or One-Command Launch:
```bash
./start.sh
```

---

## 6. Verification & Automated Test Suite

We provide a comprehensive automated test suite verifying all endpoints, pgvector HNSW indexing, triggers, views, and pairwise collusion detection.

To run the test suite:
```bash
./backend/.venv/bin/pytest backend/tests/test_api.py -v
```

### Test Results Output:
```
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.2.0, pluggy-1.7.0
rootdir: /home/andey/Documents/Sem5/DBMS/grp_prj/backend
configfile: pytest.ini

backend/tests/test_api.py::test_health_check PASSED                      [  8%]
backend/tests/test_api.py::test_list_tests PASSED                        [ 16%]
backend/tests/test_api.py::test_get_test_details PASSED                  [ 25%]
backend/tests/test_api.py::test_list_submissions PASSED                  [ 33%]
backend/tests/test_api.py::test_showcase_stats PASSED                    [ 41%]
backend/tests/test_api.py::test_explain_vector_search PASSED             [ 50%]
backend/tests/test_api.py::test_showcase_views PASSED                    [ 58%]
backend/tests/test_api.py::test_plagiarism_matrix_q101 PASSED            [ 66%]
backend/tests/test_api.py::test_trigger_demonstration PASSED             [ 75%]
backend/tests/test_api.py::test_create_test_and_add_question PASSED      [ 83%]
backend/tests/test_api.py::test_submit_student_test_and_auto_evaluate PASSED [ 91%]
backend/tests/test_api.py::test_validation_nonexistent_foreign_keys PASSED [100%]

============================== 12 passed in 9.11s ==============================
```

---

## 7. Role Switching Demonstration (Viva Guide)

In the UI navbar, click the user badge in the upper right corner to switch roles instantly:

1. **Teacher Mode (`Dr. Deena Hajim` / `Prof. Nagasundari S`):**
   - Click **Create Test** to define questions and model benchmark answers.
   - Click **Batch Auto-Grade** to compute semantic similarities and evaluate all students.
   - Click **Pairwise Plagiarism Matrix** to view the interactive $N \times N$ collusion heatmap for Q101, Q102, and Q103. Notice the high collusion alert (red badge, 99.9% match) between **Ananya Ratnaparkhi (`PES2UG24CS058`)** and **Vikram Patel (`PES2UG24CS115`)** on Q101!
2. **Student Mode (`Hemanth Andey` / `Ananya Ratnaparkhi`):**
   - Click **Start Test Attempt** on available tests.
   - Write subjective explanations and submit for instant vector evaluation.
   - Inspect the score breakdown comparing your submission with the teacher's benchmark solution.
3. **DBMS Showcase Tab:**
   - **Live Views:** Query `v_similarity_evaluation`, `v_plagiarism_matrix`, `v_student_submission_summary`, and `v_test_details`.
   - **EXPLAIN ANALYZE:** Click *Run Query Plan in Postgres* to inspect the HNSW vector index scan and buffer execution timings.
   - **Trigger Testing:** Adjust an answer's marks using the slider, click *Execute UPDATE & Fire Triggers*, and observe `SUBMISSION.total_score` and `AUDIT_LOG` update live.

---

## 8. Team Member Contributions

- **Ananya Ratnaparkhi (`PES2UG24CS058`):**
  - Designed Relational Schema and ER mappings.
  - Implemented SQL DDL, CHECK constraints, foreign key cascades, and views (`v_test_details`, `v_plagiarism_matrix`).
  - Implemented Student vs Student pairwise similarity matrix logic and frontend collusion heatmap.
- **Hemanth Andey (`PES2UG24CS061`):**
  - Configured PostgreSQL 16 `pgvector` container and HNSW vector indexing (`idx_embedding_vector_hnsw`).
  - Implemented PostgreSQL triggers (`trg_recalculate_submission_score`, `trg_audit_answer_score`) and stored procedure `sp_evaluate_submission`.
  - Built Python FastAPI vector microservice with `sentence-transformers` and Next.js frontend with role switcher and DBMS showcase panel.
