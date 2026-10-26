from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from db import get_db_cursor
from models import SubmissionCreate, SubmissionOut
from services.embedding_service import embedding_service
from services.evaluation_service import evaluation_service
import uuid

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])

@router.get("", response_model=List[SubmissionOut])
def list_submissions(
    student_id: Optional[str] = Query(None, description="Filter by Student SRN"),
    test_id: Optional[str] = Query(None, description="Filter by Test ID")
):
    """List submissions queried from v_student_submission_summary view."""
    with get_db_cursor(commit=False) as cursor:
        query = "SELECT * FROM v_student_submission_summary WHERE 1=1"
        params = []
        if student_id:
            query += " AND student_id = %s"
            params.append(student_id)
        if test_id:
            query += " AND test_id = %s"
            params.append(test_id)
        query += " ORDER BY submitted_at DESC;"

        cursor.execute(query, tuple(params))
        submissions = cursor.fetchall()
        return [dict(s) for s in submissions]

@router.get("/{submission_id}")
def get_submission_details(submission_id: str):
    """Retrieve complete submission record with question text, student answer, benchmark answer, and score."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("SELECT * FROM v_student_submission_summary WHERE submission_id = %s;", (submission_id,))
        summary = cursor.fetchone()
        if not summary:
            raise HTTPException(status_code=404, detail="Submission not found")

        cursor.execute("""
            SELECT 
                a.answer_id,
                a.question_id,
                q.question_text,
                q.marks AS max_marks,
                a.answer_text,
                a.marks_awarded,
                sr.similarity_score,
                ref_a.answer_text AS benchmark_answer_text,
                a.is_reference
            FROM ANSWER a
            JOIN QUESTION q ON a.question_id = q.question_id
            LEFT JOIN ANSWER ref_a ON q.question_id = ref_a.question_id AND ref_a.is_reference = TRUE
            LEFT JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
            LEFT JOIN SIMILARITY_RESULT sr ON ae.embedding_id = sr.embedding_id AND sr.comparison_type = 'BENCHMARK'
            WHERE a.submission_id = %s
            ORDER BY q.question_id ASC;
        """, (submission_id,))
        answers = cursor.fetchall()

        sub_data = dict(summary)
        sub_data["answers"] = [dict(a) for a in answers]
        return sub_data

@router.post("", status_code=201)
def submit_test(sub_in: SubmissionCreate, auto_evaluate: bool = Query(True, description="Automatically evaluate upon submission")):
    """
    Submits a student's subjective answers for a test.
    Performs transactional insert, embeds answers via sentence-transformers,
    and runs cosine similarity evaluation against benchmark answers.
    """
    submission_id = sub_in.submission_id or f"SUB_{uuid.uuid4().hex[:8].upper()}"

    with get_db_cursor(commit=True) as cursor:
        # Check student
        cursor.execute("SELECT student_id FROM STUDENT WHERE student_id = %s;", (sub_in.student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Student ID '{sub_in.student_id}' does not exist.")

        # Check test
        cursor.execute("SELECT test_id FROM TEST WHERE test_id = %s;", (sub_in.test_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Test ID '{sub_in.test_id}' does not exist.")

        # Check for duplicate submission
        cursor.execute("""
            SELECT submission_id FROM SUBMISSION 
            WHERE student_id = %s AND test_id = %s;
        """, (sub_in.student_id, sub_in.test_id))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Student has already submitted an attempt for this test.")

        # Insert Submission
        cursor.execute("""
            INSERT INTO SUBMISSION (submission_id, student_id, test_id, status)
            VALUES (%s, %s, %s, 'SUBMITTED');
        """, (submission_id, sub_in.student_id, sub_in.test_id))

        # Insert Answers
        for ans in sub_in.answers:
            ans_id = f"ANS_{uuid.uuid4().hex[:10].upper()}"
            cleaned_text = (ans.answer_text or "").strip()
            if not cleaned_text:
                cleaned_text = "[No answer provided]"
            cursor.execute("""
                INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
                VALUES (%s, %s, %s, %s, 0.00, FALSE);
            """, (ans_id, submission_id, ans.question_id, cleaned_text))

    # Synchronize embeddings
    embedding_service.sync_missing_embeddings()

    # Automatically evaluate against benchmark
    if auto_evaluate:
        eval_result = evaluation_service.evaluate_submission(submission_id)
        return {
            "message": "Submission received and evaluated successfully",
            "submission_id": submission_id,
            "total_score": eval_result["summary"]["total_score"] if eval_result.get("summary") else 0.00,
            "status": eval_result["summary"]["status"] if eval_result.get("summary") else "EVALUATED"
        }

    return {"message": "Submission received successfully", "submission_id": submission_id}
