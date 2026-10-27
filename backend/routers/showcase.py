from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from db import get_db_cursor
from pydantic import BaseModel

router = APIRouter(prefix="/api/showcase", tags=["DBMS Showcase"])

class TriggerTestRequest(BaseModel):
    answer_id: str
    new_marks: float

@router.get("/views/{view_name}")
def inspect_view(view_name: str):
    """
    Directly query database views (v_test_details, v_student_submission_summary, 
    v_similarity_evaluation, v_plagiarism_matrix) for live inspection.
    """
    valid_views = [
        "v_test_details", 
        "v_student_submission_summary", 
        "v_similarity_evaluation", 
        "v_plagiarism_matrix"
    ]
    if view_name not in valid_views:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid view name. Must be one of: {', '.join(valid_views)}"
        )

    with get_db_cursor(commit=False) as cursor:
        cursor.execute(f"SELECT * FROM {view_name} LIMIT 50;")
        rows = cursor.fetchall()
        
        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []

        return {
            "view_name": view_name,
            "columns": columns,
            "row_count": len(rows),
            "rows": [dict(r) for r in rows]
        }

@router.post("/explain-vector-search")
def explain_vector_search():
    """
    Runs PostgreSQL EXPLAIN (ANALYZE, BUFFERS) on a pgvector cosine distance query
    demonstrating HNSW index scanning, cost estimation, and buffer hits.
    """
    with get_db_cursor(commit=False) as cursor:
        # Check if benchmark embedding exists
        cursor.execute("SELECT answer_id FROM ANSWER WHERE is_reference = TRUE LIMIT 1;")
        ref = cursor.fetchone()
        ref_id = ref["answer_id"] if ref else "ANS_REF_Q101"

        query = f"""
        EXPLAIN (ANALYZE, BUFFERS, COSTS)
        SELECT 
            a.answer_id,
            a.answer_text,
            ae.embedding <=> (SELECT embedding FROM ANSWER_EMBEDDING WHERE answer_id = '{ref_id}') AS cosine_distance
        FROM ANSWER a
        JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
        ORDER BY ae.embedding <=> (SELECT embedding FROM ANSWER_EMBEDDING WHERE answer_id = '{ref_id}') ASC
        LIMIT 5;
        """
        cursor.execute(query)
        plan_rows = cursor.fetchall()

        return {
            "query": query.strip(),
            "reference_answer_id": ref_id,
            "execution_plan": [list(r.values())[0] for r in plan_rows]
        }

@router.get("/audit-logs")
def get_audit_logs():
    """Fetches recent entries from AUDIT_LOG table to demonstrate database triggers."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT log_id, entity_name, record_id, action_type, old_val, new_val, performed_by, log_time
            FROM AUDIT_LOG
            ORDER BY log_time DESC
            LIMIT 50;
        """)
        logs = cursor.fetchall()
        return [dict(l) for l in logs]

@router.post("/test-trigger")
def test_trigger_demonstration(req: TriggerTestRequest):
    """
    Manually modifies an answer's marks_awarded to demonstrate live firing of:
    1. trg_recalculate_submission_score -> Updates SUBMISSION.total_score
    2. trg_audit_answer_score -> Appends row to AUDIT_LOG
    """
    with get_db_cursor(commit=True) as cursor:
        # Check answer & get submission_id and old marks
        cursor.execute("""
            SELECT a.answer_id, a.submission_id, a.marks_awarded, s.total_score AS old_submission_total
            FROM ANSWER a
            JOIN SUBMISSION s ON a.submission_id = s.submission_id
            WHERE a.answer_id = %s;
        """, (req.answer_id,))
        ans = cursor.fetchone()
        if not ans:
            raise HTTPException(status_code=404, detail="Answer not found")

        old_marks = float(ans["marks_awarded"])
        sub_id = ans["submission_id"]
        old_sub_total = float(ans["old_submission_total"])

        # Update marks_awarded
        cursor.execute("""
            UPDATE ANSWER 
            SET marks_awarded = %s 
            WHERE answer_id = %s;
        """, (req.new_marks, req.answer_id))

        # Check updated SUBMISSION
        cursor.execute("""
            SELECT total_score, status 
            FROM SUBMISSION 
            WHERE submission_id = %s;
        """, (sub_id,))
        new_sub = cursor.fetchone()

        # Check latest audit log entry
        cursor.execute("""
            SELECT * FROM AUDIT_LOG 
            WHERE record_id = %s 
            ORDER BY log_time DESC LIMIT 1;
        """, (req.answer_id,))
        latest_audit = cursor.fetchone()

        return {
            "message": "Trigger executed successfully",
            "answer_id": req.answer_id,
            "submission_id": sub_id,
            "answer_marks": {
                "old": old_marks,
                "new": req.new_marks
            },
            "submission_score": {
                "before_trigger": old_sub_total,
                "after_trigger": float(new_sub["total_score"]) if new_sub else None,
                "status": new_sub["status"] if new_sub else None
            },
            "audit_log_entry": dict(latest_audit) if latest_audit else None
        }

@router.get("/stats")
def get_system_stats():
    """Returns database summary statistics across all relations and vector embeddings."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM TEACHER) AS teacher_count,
                (SELECT COUNT(*) FROM STUDENT WHERE student_id != 'REF_BENCHMARK') AS student_count,
                (SELECT COUNT(*) FROM TEST) AS test_count,
                (SELECT COUNT(*) FROM QUESTION) AS question_count,
                (SELECT COUNT(*) FROM SUBMISSION WHERE student_id != 'REF_BENCHMARK') AS submission_count,
                (SELECT COUNT(*) FROM ANSWER WHERE is_reference = FALSE) AS student_answers_count,
                (SELECT COUNT(*) FROM ANSWER WHERE is_reference = TRUE) AS benchmark_answers_count,
                (SELECT COUNT(*) FROM ANSWER_EMBEDDING) AS embedding_count,
                (SELECT COUNT(*) FROM SIMILARITY_RESULT WHERE comparison_type = 'BENCHMARK') AS benchmark_similarity_count,
                (SELECT COUNT(*) FROM SIMILARITY_RESULT WHERE comparison_type = 'PEER_PLAGIARISM') AS peer_plagiarism_count,
                (SELECT COUNT(*) FROM AUDIT_LOG) AS audit_log_count;
        """)
        stats = cursor.fetchone()
        return dict(stats) if stats else {}
