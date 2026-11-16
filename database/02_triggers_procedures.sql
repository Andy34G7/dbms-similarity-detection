-- ============================================================================
-- Automated Test Evaluation & Vector Similarity System
-- Database: PostgreSQL 16 (with pgvector extension)
-- Advanced DB Features: Triggers, Stored Procedures, and Functions
-- Section / Team: PES2UG24CS058 & PES2UG24CS061
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger Function: Auto-Recalculate Submission Total Score & Status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalculate_submission_score()
RETURNS TRIGGER AS $$
DECLARE
    v_sub_id VARCHAR(30);
    v_student_id VARCHAR(20);
    v_total NUMERIC(6, 2);
    v_total_questions INT;
    v_evaluated_answers INT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_sub_id := OLD.submission_id;
    ELSE
        v_sub_id := NEW.submission_id;
    END IF;

    -- Look up student_id for this submission
    SELECT student_id INTO v_student_id
    FROM SUBMISSION
    WHERE submission_id = v_sub_id;

    -- Aggregate total marks awarded for this submission
    SELECT COALESCE(SUM(marks_awarded), 0.00)
    INTO v_total
    FROM ANSWER
    WHERE submission_id = v_sub_id;

    -- Get total questions for this test
    SELECT COUNT(q.question_id)
    INTO v_total_questions
    FROM QUESTION q
    JOIN SUBMISSION s ON q.test_id = s.test_id
    WHERE s.submission_id = v_sub_id;

    -- Count how many distinct answers have been evaluated against benchmark
    SELECT COUNT(DISTINCT a.answer_id)
    INTO v_evaluated_answers
    FROM ANSWER a
    JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
    JOIN SIMILARITY_RESULT sr ON ae.embedding_id = sr.embedding_id
    WHERE a.submission_id = v_sub_id AND sr.comparison_type = 'BENCHMARK';

    -- Update SUBMISSION total score and status atomically
    UPDATE SUBMISSION
    SET total_score = v_total,
        status = CASE 
            WHEN status = 'DRAFT' THEN 'DRAFT'
            WHEN v_student_id = 'REF_BENCHMARK' THEN 'EVALUATED'
            WHEN v_evaluated_answers >= v_total_questions AND v_total_questions > 0 THEN 'EVALUATED'
            ELSE 'SUBMITTED'
        END
    WHERE submission_id = v_sub_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_submission_score ON ANSWER;
CREATE TRIGGER trg_recalculate_submission_score
AFTER INSERT OR UPDATE OF marks_awarded OR DELETE ON ANSWER
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_submission_score();


-- -----------------------------------------------------------------------------
-- 2. Trigger Function: Audit Trail for Score Modifications (Transparency)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_answer_score_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO AUDIT_LOG (entity_name, record_id, action_type, old_val, new_val, performed_by)
    VALUES (
        'ANSWER',
        NEW.answer_id,
        'UPDATE_MARKS',
        'marks_awarded: ' || COALESCE(OLD.marks_awarded::TEXT, '0.00'),
        'marks_awarded: ' || COALESCE(NEW.marks_awarded::TEXT, '0.00'),
        'TRIGGER:trg_audit_answer_score'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_answer_score ON ANSWER;
CREATE TRIGGER trg_audit_answer_score
AFTER UPDATE OF marks_awarded ON ANSWER
FOR EACH ROW
WHEN (OLD.marks_awarded IS DISTINCT FROM NEW.marks_awarded)
EXECUTE FUNCTION fn_audit_answer_score_update();


-- -----------------------------------------------------------------------------
-- 3. Scalar & Table-Returning SQL Functions (Rubric: Procedure/Function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_compute_awarded_marks(
    p_similarity NUMERIC,
    p_max_marks NUMERIC,
    p_threshold_full NUMERIC DEFAULT 0.75,
    p_threshold_partial NUMERIC DEFAULT 0.50
)
RETURNS NUMERIC(5, 2) AS $$
BEGIN
    IF COALESCE(p_similarity, 0.0000) >= p_threshold_full THEN
        RETURN p_max_marks;
    ELSIF COALESCE(p_similarity, 0.0000) >= p_threshold_partial THEN
        RETURN ROUND(p_max_marks * 0.50, 2);
    ELSE
        RETURN 0.00;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_find_similar_answers(
    p_answer_id VARCHAR(40),
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    matched_answer_id VARCHAR(40),
    student_id VARCHAR(20),
    similarity_score NUMERIC(5, 4),
    answer_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.answer_id,
        s.student_id,
        ROUND(GREATEST(0.0000, LEAST(1.0000, (1 - (ae.embedding <=> target.embedding))::numeric)), 4) AS similarity_score,
        a.answer_text
    FROM ANSWER_EMBEDDING ae
    JOIN ANSWER a ON ae.answer_id = a.answer_id
    JOIN SUBMISSION s ON a.submission_id = s.submission_id
    CROSS JOIN (
        SELECT embedding FROM ANSWER_EMBEDDING WHERE answer_id = p_answer_id
    ) target
    WHERE a.answer_id <> p_answer_id
    ORDER BY ae.embedding <=> target.embedding ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: Automated Evaluation & Grading using Similarity Score
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_evaluate_submission(
    p_submission_id VARCHAR(30),
    p_threshold_full NUMERIC DEFAULT 0.75,
    p_threshold_partial NUMERIC DEFAULT 0.50
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_awarded NUMERIC(5, 2);
BEGIN
    -- Iterate through each answer submitted for this submission
    FOR r IN 
        SELECT 
            a.answer_id, 
            a.question_id, 
            q.marks, 
            sr.similarity_score
        FROM ANSWER a
        JOIN QUESTION q ON a.question_id = q.question_id
        LEFT JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
        LEFT JOIN SIMILARITY_RESULT sr ON ae.embedding_id = sr.embedding_id AND sr.comparison_type = 'BENCHMARK'
        WHERE a.submission_id = p_submission_id
    LOOP
        v_awarded := fn_compute_awarded_marks(
            r.similarity_score,
            r.marks,
            p_threshold_full,
            p_threshold_partial
        );

        -- Update marks_awarded. trg_recalculate_submission_score will automatically
        -- fire and update SUBMISSION.total_score and status.
        UPDATE ANSWER
        SET marks_awarded = v_awarded
        WHERE answer_id = r.answer_id;
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: Seed Benchmark Reference Answer for a Question
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_ensure_benchmark_submission(
    p_test_id VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Ensure Benchmark Model Student exists
    INSERT INTO STUDENT (student_id, name, email)
    VALUES ('REF_BENCHMARK', 'Benchmark Model Key', 'benchmark@pes.edu')
    ON CONFLICT (student_id) DO NOTHING;

    -- Ensure Benchmark Submission exists for this test
    INSERT INTO SUBMISSION (submission_id, student_id, test_id, status)
    VALUES ('SUB_BENCH_' || p_test_id, 'REF_BENCHMARK', p_test_id, 'EVALUATED')
    ON CONFLICT (submission_id) DO NOTHING;
END;
$$;
