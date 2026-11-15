-- ============================================================================
-- Automated Test Evaluation & Vector Similarity System
-- Database: PostgreSQL 16 (with pgvector extension)
-- Relational Views for Evaluation, Aggregation, and Plagiarism Analysis
-- Section / Team: PES2UG24CS058 & PES2UG24CS061
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. Test Overview View (Aggregating question counts, test marks & submissions)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_test_details AS
SELECT 
    t.test_id,
    t.title AS test_title,
    t.description,
    tc.teacher_id,
    tc.name AS teacher_name,
    tc.email AS teacher_email,
    tc.dept_name AS teacher_department,
    (SELECT COUNT(question_id) FROM QUESTION WHERE test_id = t.test_id) AS total_questions,
    (SELECT COALESCE(SUM(marks), 0.00) FROM QUESTION WHERE test_id = t.test_id) AS total_test_marks,
    COUNT(DISTINCT CASE WHEN s.student_id != 'REF_BENCHMARK' THEN s.submission_id END) AS submission_count,
    t.created_at
FROM TEST t
JOIN TEACHER tc ON t.teacher_id = tc.teacher_id
LEFT JOIN SUBMISSION s ON t.test_id = s.test_id
GROUP BY t.test_id, t.title, t.description, tc.teacher_id, tc.name, tc.email, tc.dept_name, t.created_at;

-- -----------------------------------------------------------------------------
-- 2. Student Submission Summary View
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_submission_summary AS
SELECT 
    s.submission_id,
    st.student_id,
    st.name AS student_name,
    st.email AS student_email,
    t.test_id,
    t.title AS test_title,
    s.submitted_at,
    s.status,
    s.total_score,
    (SELECT COALESCE(SUM(marks), 0.00) FROM QUESTION WHERE test_id = t.test_id) AS max_test_marks,
    COUNT(DISTINCT a.answer_id) AS answered_questions,
    (SELECT COUNT(question_id) FROM QUESTION WHERE test_id = t.test_id) AS total_questions,
    CASE 
        WHEN COALESCE((SELECT SUM(marks) FROM QUESTION WHERE test_id = t.test_id), 0.00) > 0 
        THEN ROUND((s.total_score / (SELECT SUM(marks) FROM QUESTION WHERE test_id = t.test_id)) * 100, 2)
        ELSE 0.00
    END AS percentage_score
FROM SUBMISSION s
JOIN STUDENT st ON s.student_id = st.student_id
JOIN TEST t ON s.test_id = t.test_id
LEFT JOIN ANSWER a ON s.submission_id = a.submission_id
WHERE st.student_id != 'REF_BENCHMARK'
GROUP BY s.submission_id, st.student_id, st.name, st.email, t.test_id, t.title, s.submitted_at, s.status, s.total_score;

-- -----------------------------------------------------------------------------
-- 3. Benchmark Similarity Evaluation View
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_similarity_evaluation AS
SELECT 
    sr.result_id,
    s.submission_id,
    st.student_id,
    st.name AS student_name,
    q.question_id,
    q.question_text,
    q.marks AS max_marks,
    a1.answer_id AS student_answer_id,
    a1.answer_text AS student_answer_text,
    a1.marks_awarded,
    a2.answer_id AS benchmark_answer_id,
    a2.answer_text AS benchmark_answer_text,
    sr.similarity_score,
    sr.comparison_type,
    ae.model_name,
    sr.evaluated_at
FROM SIMILARITY_RESULT sr
JOIN ANSWER_EMBEDDING ae ON sr.embedding_id = ae.embedding_id
JOIN ANSWER a1 ON ae.answer_id = a1.answer_id
JOIN ANSWER a2 ON sr.compared_answer_id = a2.answer_id
JOIN SUBMISSION s ON a1.submission_id = s.submission_id
JOIN STUDENT st ON s.student_id = st.student_id
JOIN QUESTION q ON a1.question_id = q.question_id
WHERE sr.comparison_type = 'BENCHMARK';

-- -----------------------------------------------------------------------------
-- 4. Pairwise Student-to-Student Plagiarism / Collusion Matrix View
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_plagiarism_matrix AS
SELECT 
    sr.result_id,
    q.question_id,
    q.question_text,
    st1.student_id AS student_1_id,
    st1.name AS student_1_name,
    a1.answer_id AS student_1_answer_id,
    a1.answer_text AS student_1_answer_text,
    st2.student_id AS student_2_id,
    st2.name AS student_2_name,
    a2.answer_id AS student_2_answer_id,
    a2.answer_text AS student_2_answer_text,
    sr.similarity_score,
    CASE 
        WHEN sr.similarity_score >= 0.85 THEN 'HIGH_COLLUSION'
        WHEN sr.similarity_score >= 0.65 THEN 'MODERATE_SIMILARITY'
        ELSE 'LOW_SIMILARITY'
    END AS collusion_risk,
    sr.evaluated_at
FROM SIMILARITY_RESULT sr
JOIN ANSWER_EMBEDDING ae ON sr.embedding_id = ae.embedding_id
JOIN ANSWER a1 ON ae.answer_id = a1.answer_id
JOIN SUBMISSION sub1 ON a1.submission_id = sub1.submission_id
JOIN STUDENT st1 ON sub1.student_id = st1.student_id
JOIN ANSWER a2 ON sr.compared_answer_id = a2.answer_id
JOIN SUBMISSION sub2 ON a2.submission_id = sub2.submission_id
JOIN STUDENT st2 ON sub2.student_id = st2.student_id
JOIN QUESTION q ON a1.question_id = q.question_id
WHERE sr.comparison_type = 'PEER_PLAGIARISM'
  AND st1.student_id < st2.student_id;

-- -----------------------------------------------------------------------------
-- 5. Collusion Candidates Summary (Demonstrating GROUP BY with HAVING & Aggregates)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_high_collusion_candidates AS
SELECT 
    st1.student_id AS student_1_id,
    st1.name AS student_1_name,
    st2.student_id AS student_2_id,
    st2.name AS student_2_name,
    COUNT(DISTINCT q.question_id) AS shared_similar_questions,
    ROUND(AVG(sr.similarity_score), 4) AS average_pairwise_similarity,
    ROUND(MAX(sr.similarity_score), 4) AS peak_similarity_score
FROM SIMILARITY_RESULT sr
JOIN ANSWER_EMBEDDING ae ON sr.embedding_id = ae.embedding_id
JOIN ANSWER a1 ON ae.answer_id = a1.answer_id
JOIN SUBMISSION sub1 ON a1.submission_id = sub1.submission_id
JOIN STUDENT st1 ON sub1.student_id = st1.student_id
JOIN ANSWER a2 ON sr.compared_answer_id = a2.answer_id
JOIN SUBMISSION sub2 ON a2.submission_id = sub2.submission_id
JOIN STUDENT st2 ON sub2.student_id = st2.student_id
JOIN QUESTION q ON a1.question_id = q.question_id
WHERE sr.comparison_type = 'PEER_PLAGIARISM'
  AND st1.student_id < st2.student_id
GROUP BY 
    st1.student_id,
    st1.name,
    st2.student_id,
    st2.name
HAVING AVG(sr.similarity_score) >= 0.50 AND COUNT(DISTINCT q.question_id) >= 1
ORDER BY peak_similarity_score DESC;

-- -----------------------------------------------------------------------------
-- 6. Student Benchmark Ranking View (Demonstrating Common Table Expression / CTE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_benchmark_cte AS
WITH benchmark_scores AS (
    SELECT 
        s.submission_id,
        s.student_id,
        s.test_id,
        AVG(sr.similarity_score) AS avg_benchmark_similarity,
        COUNT(sr.result_id) AS evaluated_questions
    FROM SUBMISSION s
    JOIN ANSWER a ON s.submission_id = a.submission_id
    JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
    JOIN SIMILARITY_RESULT sr ON ae.embedding_id = sr.embedding_id
    WHERE sr.comparison_type = 'BENCHMARK'
      AND s.student_id != 'REF_BENCHMARK'
    GROUP BY s.submission_id, s.student_id, s.test_id
)
SELECT 
    bs.submission_id,
    st.student_id,
    st.name AS student_name,
    t.test_id,
    t.title AS test_title,
    bs.evaluated_questions,
    ROUND(bs.avg_benchmark_similarity, 4) AS avg_benchmark_similarity,
    sub.total_score,
    RANK() OVER (PARTITION BY t.test_id ORDER BY bs.avg_benchmark_similarity DESC) AS similarity_rank
FROM benchmark_scores bs
JOIN STUDENT st ON bs.student_id = st.student_id
JOIN TEST t ON bs.test_id = t.test_id
JOIN SUBMISSION sub ON bs.submission_id = sub.submission_id;

-- -----------------------------------------------------------------------------
-- 7. Transitive Collusion Clusters View (Demonstrating WITH RECURSIVE CTE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_collusion_clusters AS
WITH RECURSIVE collusion_edges AS (
    SELECT DISTINCT
        q.question_id,
        sub1.student_id AS src_student_id,
        sub2.student_id AS dst_student_id,
        sr.similarity_score
    FROM SIMILARITY_RESULT sr
    JOIN ANSWER_EMBEDDING ae ON sr.embedding_id = ae.embedding_id
    JOIN ANSWER a1 ON ae.answer_id = a1.answer_id
    JOIN SUBMISSION sub1 ON a1.submission_id = sub1.submission_id
    JOIN ANSWER a2 ON sr.compared_answer_id = a2.answer_id
    JOIN SUBMISSION sub2 ON a2.submission_id = sub2.submission_id
    JOIN QUESTION q ON a1.question_id = q.question_id
    WHERE sr.comparison_type = 'PEER_PLAGIARISM'
      AND sr.similarity_score >= 0.85
),
collusion_chain AS (
    SELECT 
        ce.question_id,
        ce.src_student_id AS root_student_id,
        ce.dst_student_id AS linked_student_id,
        1 AS hop_depth,
        ce.similarity_score AS edge_similarity,
        ARRAY[ce.src_student_id, ce.dst_student_id]::VARCHAR[] AS cluster_path
    FROM collusion_edges ce
    UNION ALL
    SELECT 
        cc.question_id,
        cc.root_student_id,
        ce.dst_student_id,
        cc.hop_depth + 1,
        ce.similarity_score,
        cc.cluster_path || ce.dst_student_id
    FROM collusion_chain cc
    JOIN collusion_edges ce 
      ON cc.question_id = ce.question_id
     AND cc.linked_student_id = ce.src_student_id
    WHERE NOT (ce.dst_student_id = ANY(cc.cluster_path))
      AND cc.hop_depth < 5
)
SELECT 
    cc.question_id,
    cc.root_student_id,
    st1.name AS root_student_name,
    cc.linked_student_id,
    st2.name AS linked_student_name,
    cc.hop_depth,
    cc.edge_similarity,
    array_to_string(cc.cluster_path, ' -> ') AS collusion_path
FROM collusion_chain cc
JOIN STUDENT st1 ON cc.root_student_id = st1.student_id
JOIN STUDENT st2 ON cc.linked_student_id = st2.student_id
ORDER BY cc.question_id, cc.root_student_id, cc.hop_depth;
