-- ============================================================================
-- Automated Test Evaluation & Vector Similarity System
-- Database: PostgreSQL 16 (with pgvector extension)
-- Schema Definition: DDL with Constraints, Foreign Keys & HNSW Vector Indexing
-- Section / Team: PES2UG24CS058 & PES2UG24CS061
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing views and tables if rebuilding
DROP VIEW IF EXISTS v_plagiarism_matrix CASCADE;
DROP VIEW IF EXISTS v_similarity_evaluation CASCADE;
DROP VIEW IF EXISTS v_student_submission_summary CASCADE;
DROP VIEW IF EXISTS v_test_details CASCADE;
DROP TABLE IF EXISTS AUDIT_LOG CASCADE;
DROP TABLE IF EXISTS SIMILARITY_RESULT CASCADE;
DROP TABLE IF EXISTS ANSWER_EMBEDDING CASCADE;
DROP TABLE IF EXISTS ANSWER CASCADE;
DROP TABLE IF EXISTS SUBMISSION CASCADE;
DROP TABLE IF EXISTS STUDENT CASCADE;
DROP TABLE IF EXISTS QUESTION CASCADE;
DROP TABLE IF EXISTS TEST CASCADE;
DROP TABLE IF EXISTS TEACHER CASCADE;

-- -----------------------------------------------------------------------------
-- 1. TEACHER Table
-- -----------------------------------------------------------------------------
CREATE TABLE TEACHER (
    teacher_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    dept_name VARCHAR(50) NOT NULL DEFAULT 'Computer Science',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_teacher PRIMARY KEY (teacher_id),
    CONSTRAINT unq_teacher_email UNIQUE (email),
    CONSTRAINT chk_teacher_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- -----------------------------------------------------------------------------
-- 2. TEST Table
-- -----------------------------------------------------------------------------
CREATE TABLE TEST (
    test_id VARCHAR(20) NOT NULL,
    teacher_id VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_test PRIMARY KEY (test_id),
    CONSTRAINT fk_test_teacher FOREIGN KEY (teacher_id) 
        REFERENCES TEACHER(teacher_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_test_title_length CHECK (LENGTH(title) >= 3)
);

-- -----------------------------------------------------------------------------
-- 3. QUESTION Table
-- -----------------------------------------------------------------------------
CREATE TABLE QUESTION (
    question_id VARCHAR(40) NOT NULL,
    test_id VARCHAR(20) NOT NULL,
    question_text TEXT NOT NULL,
    marks NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    sample_solution TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_question PRIMARY KEY (question_id),
    CONSTRAINT fk_question_test FOREIGN KEY (test_id) 
        REFERENCES TEST(test_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_question_marks CHECK (marks > 0)
);

-- -----------------------------------------------------------------------------
-- 4. STUDENT Table
-- -----------------------------------------------------------------------------
CREATE TABLE STUDENT (
    student_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_student PRIMARY KEY (student_id),
    CONSTRAINT unq_student_email UNIQUE (email),
    CONSTRAINT chk_student_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- -----------------------------------------------------------------------------
-- 5. SUBMISSION Table
-- -----------------------------------------------------------------------------
CREATE TABLE SUBMISSION (
    submission_id VARCHAR(30) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    test_id VARCHAR(20) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    total_score NUMERIC(6, 2) DEFAULT 0.00,
    CONSTRAINT pk_submission PRIMARY KEY (submission_id),
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id) 
        REFERENCES STUDENT(student_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_submission_test FOREIGN KEY (test_id) 
        REFERENCES TEST(test_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_submission_status CHECK (status IN ('DRAFT', 'SUBMITTED', 'EVALUATED', 'ARCHIVED')),
    CONSTRAINT chk_submission_total_score CHECK (total_score >= 0)
);

-- -----------------------------------------------------------------------------
-- 6. ANSWER Table
-- -----------------------------------------------------------------------------
CREATE TABLE ANSWER (
    answer_id VARCHAR(40) NOT NULL,
    submission_id VARCHAR(30) NOT NULL,
    question_id VARCHAR(40) NOT NULL,
    answer_text TEXT NOT NULL,
    marks_awarded NUMERIC(5, 2) DEFAULT 0.00,
    is_reference BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_answer PRIMARY KEY (answer_id),
    CONSTRAINT fk_answer_submission FOREIGN KEY (submission_id) 
        REFERENCES SUBMISSION(submission_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_answer_question FOREIGN KEY (question_id) 
        REFERENCES QUESTION(question_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_answer_marks CHECK (marks_awarded >= 0),
    CONSTRAINT unq_submission_question UNIQUE (submission_id, question_id)
);

-- Ensure each question has at most one reference benchmark answer
CREATE UNIQUE INDEX IF NOT EXISTS unq_question_reference 
ON ANSWER(question_id) 
WHERE is_reference = TRUE;

-- -----------------------------------------------------------------------------
-- 7. ANSWER_EMBEDDING Table (pgvector 384-dimensional dense vectors)
-- -----------------------------------------------------------------------------
CREATE TABLE ANSWER_EMBEDDING (
    embedding_id VARCHAR(50) NOT NULL,
    answer_id VARCHAR(40) NOT NULL,
    embedding vector(384) NOT NULL,
    model_name VARCHAR(100) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_answer_embedding PRIMARY KEY (embedding_id),
    CONSTRAINT fk_embedding_answer FOREIGN KEY (answer_id) 
        REFERENCES ANSWER(answer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT unq_embedding_answer UNIQUE (answer_id)
);

-- -----------------------------------------------------------------------------
-- 8. SIMILARITY_RESULT Table (Weak Entity)
-- -----------------------------------------------------------------------------
CREATE TABLE SIMILARITY_RESULT (
    result_id VARCHAR(100) NOT NULL,
    embedding_id VARCHAR(50) NOT NULL,
    compared_answer_id VARCHAR(40) NOT NULL,
    similarity_score NUMERIC(5, 4) NOT NULL,
    comparison_type VARCHAR(20) DEFAULT 'BENCHMARK',
    evaluated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_similarity_result PRIMARY KEY (result_id, embedding_id),
    CONSTRAINT fk_sim_embedding FOREIGN KEY (embedding_id) 
        REFERENCES ANSWER_EMBEDDING(embedding_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_sim_compared_answer FOREIGN KEY (compared_answer_id) 
        REFERENCES ANSWER(answer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_similarity_score CHECK (similarity_score >= 0.0000 AND similarity_score <= 1.0000),
    CONSTRAINT chk_sim_type CHECK (comparison_type IN ('BENCHMARK', 'PEER_PLAGIARISM'))
);

-- -----------------------------------------------------------------------------
-- 9. AUDIT_LOG Table (Demonstrating Triggers, Transactions & Audit Trails)
-- -----------------------------------------------------------------------------
CREATE TABLE AUDIT_LOG (
    log_id SERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    old_val TEXT,
    new_val TEXT,
    performed_by VARCHAR(50) DEFAULT 'SYSTEM_TRIGGER',
    log_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 10. INDEXES (Relational B-Tree & HNSW Vector Index)
-- -----------------------------------------------------------------------------
CREATE INDEX idx_test_teacher ON TEST(teacher_id);
CREATE INDEX idx_question_test ON QUESTION(test_id);
CREATE INDEX idx_submission_student ON SUBMISSION(student_id);
CREATE INDEX idx_submission_test ON SUBMISSION(test_id);
CREATE INDEX idx_answer_submission ON ANSWER(submission_id);
CREATE INDEX idx_answer_question ON ANSWER(question_id);
CREATE INDEX idx_sim_compared_answer ON SIMILARITY_RESULT(compared_answer_id);

-- Fast HNSW cosine similarity vector index on pgvector column
CREATE INDEX idx_embedding_vector_hnsw 
ON ANSWER_EMBEDDING 
USING hnsw (embedding vector_cosine_ops);
