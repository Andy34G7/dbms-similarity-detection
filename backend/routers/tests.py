from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from db import get_db_cursor
from models import TestCreate, TestOut, QuestionCreate, QuestionOut
from services.embedding_service import embedding_service
import uuid

router = APIRouter(prefix="/api/tests", tags=["Tests"])

@router.get("", response_model=List[TestOut])
def list_tests():
    """Retrieve all tests with teacher information and submission counts from v_test_details view."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("SELECT * FROM v_test_details ORDER BY created_at DESC;")
        tests = cursor.fetchall()
        return [dict(t) for t in tests]

@router.get("/{test_id}")
def get_test_details(test_id: str):
    """Retrieve specific test metadata and all its questions."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("SELECT * FROM v_test_details WHERE test_id = %s;", (test_id,))
        test = cursor.fetchone()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        cursor.execute("""
            SELECT question_id, test_id, question_text, marks, sample_solution, created_at
            FROM QUESTION
            WHERE test_id = %s
            ORDER BY question_id ASC;
        """, (test_id,))
        questions = cursor.fetchall()

        test_data = dict(test)
        test_data["questions"] = [dict(q) for q in questions]
        return test_data

@router.post("", status_code=201)
def create_test(test_in: TestCreate):
    """
    Creates a new test, its questions, and initializes benchmark model answers.
    Demonstrates multi-table relational transaction in PostgreSQL.
    """
    test_id = test_in.test_id or f"TEST_{uuid.uuid4().hex[:8].upper()}"
    
    with get_db_cursor(commit=True) as cursor:
        # Check teacher exists
        cursor.execute("SELECT teacher_id FROM TEACHER WHERE teacher_id = %s;", (test_in.teacher_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Teacher ID '{test_in.teacher_id}' does not exist.")

        # 1. Insert Test
        cursor.execute("""
            INSERT INTO TEST (test_id, teacher_id, title, description)
            VALUES (%s, %s, %s, %s)
            RETURNING test_id;
        """, (test_id, test_in.teacher_id, test_in.title, test_in.description))

        # 2. Ensure Benchmark Model Student and Benchmark Submission exist
        cursor.execute("CALL sp_ensure_benchmark_submission(%s);", (test_id,))

        bench_sub_id = f"SUB_BENCH_{test_id}"

        # 3. Insert Questions and Benchmark Answers if provided
        if test_in.questions:
            for q in test_in.questions:
                qid = q.question_id or f"Q_{uuid.uuid4().hex[:8].upper()}"
                cursor.execute("""
                    INSERT INTO QUESTION (question_id, test_id, question_text, marks, sample_solution)
                    VALUES (%s, %s, %s, %s, %s);
                """, (qid, test_id, q.question_text, q.marks, q.sample_solution))

                # Insert Benchmark Answer
                ans_ref_id = f"ANS_REF_{qid}"
                cursor.execute("""
                    INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
                    VALUES (%s, %s, %s, %s, %s, TRUE);
                """, (ans_ref_id, bench_sub_id, qid, q.sample_solution, q.marks))

    # Synchronize embeddings for the new benchmark answers
    embedding_service.sync_missing_embeddings()

    return {"message": "Test created successfully", "test_id": test_id}

@router.post("/{test_id}/questions", status_code=201)
def add_question(test_id: str, q_in: QuestionCreate):
    """Adds a new question to an existing test along with its benchmark reference answer."""
    qid = q_in.question_id or f"Q_{uuid.uuid4().hex[:8].upper()}"
    bench_sub_id = f"SUB_BENCH_{test_id}"

    with get_db_cursor(commit=True) as cursor:
        cursor.execute("SELECT test_id FROM TEST WHERE test_id = %s;", (test_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Test not found")

        cursor.execute("CALL sp_ensure_benchmark_submission(%s);", (test_id,))

        cursor.execute("""
            INSERT INTO QUESTION (question_id, test_id, question_text, marks, sample_solution)
            VALUES (%s, %s, %s, %s, %s);
        """, (qid, test_id, q_in.question_text, q_in.marks, q_in.sample_solution))

        ans_ref_id = f"ANS_REF_{qid}"
        cursor.execute("""
            INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
            VALUES (%s, %s, %s, %s, %s, TRUE);
        """, (ans_ref_id, bench_sub_id, qid, q_in.sample_solution, q_in.marks))

    embedding_service.sync_missing_embeddings()
    return {"message": "Question added successfully", "question_id": qid}

@router.delete("/{test_id}")
def delete_test(test_id: str):
    """
    Deletes a test and cascades deletion to questions, submissions, answers,
    embeddings, and similarity results (demonstrating DML DELETE with foreign key cascade).
    Records an entry in AUDIT_LOG.
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute("SELECT test_id, title FROM TEST WHERE test_id = %s;", (test_id,))
        test = cursor.fetchone()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # Record in AUDIT_LOG
        cursor.execute("""
            INSERT INTO AUDIT_LOG (entity_name, record_id, action_type, old_val, new_val, performed_by)
            VALUES ('TEST', %s, 'DELETE_TEST', %s, NULL, 'TEACHER');
        """, (test_id, f"Deleted test: {dict(test)['title']}"))

        # Delete test (cascades via ON DELETE CASCADE to all child tables)
        cursor.execute("DELETE FROM TEST WHERE test_id = %s;", (test_id,))

    return {"message": f"Test {test_id} and all associated records deleted successfully", "test_id": test_id}
