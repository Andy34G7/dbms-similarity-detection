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
        "v_plagiarism_matrix",
        "v_high_collusion_candidates",
        "v_student_benchmark_cte",
        "v_collusion_clusters"
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
    with get_db_cursor(commit=True) as cursor:
        # Force HNSW index scan even on small seed datasets so the index plan is demonstrated
        cursor.execute("SET LOCAL enable_seqscan = off;")

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
            ORDER BY log_time DESC, log_id DESC
            LIMIT 50;
        """)
        logs = cursor.fetchall()
        return [dict(l) for l in logs]

@router.post("/test-trigger")
def test_trigger_demonstration(req: TriggerTestRequest):
    """
    Manually modifies an answer's marks_awarded to demonstrate live firing of:
    1. trg_recalculate_submission_score -> Updates SUBMISSION.total_score
    2. trg_audit_answer_score -> Appends row to AUDIT_LOG (when OLD != NEW)
    """
    with get_db_cursor(commit=True) as cursor:
        # Check answer, max_marks, and submission total
        cursor.execute("""
            SELECT a.answer_id, a.submission_id, a.marks_awarded, q.marks AS max_marks, s.total_score AS old_submission_total
            FROM ANSWER a
            JOIN QUESTION q ON a.question_id = q.question_id
            JOIN SUBMISSION s ON a.submission_id = s.submission_id
            WHERE a.answer_id = %s;
        """, (req.answer_id,))
        ans = cursor.fetchone()
        if not ans:
            raise HTTPException(status_code=404, detail="Answer not found")

        max_marks = float(ans["max_marks"])
        if req.new_marks < 0 or req.new_marks > max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Marks must be between 0 and {max_marks} for this question."
            )

        old_marks = float(ans["marks_awarded"])
        sub_id = ans["submission_id"]
        old_sub_total = float(ans["old_submission_total"])

        cursor.execute("SELECT COALESCE(MAX(log_id), 0) AS max_id FROM AUDIT_LOG;")
        prev_max_log_id = cursor.fetchone()["max_id"]

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

        # Only return an audit log entry if this UPDATE actually fired trg_audit_answer_score
        cursor.execute("""
            SELECT * FROM AUDIT_LOG 
            WHERE record_id = %s AND log_id > %s
            ORDER BY log_id DESC LIMIT 1;
        """, (req.answer_id, prev_max_log_id))
        latest_audit = cursor.fetchone()

        audit_triggered = latest_audit is not None
        msg = (
            "Trigger executed successfully"
            if audit_triggered
            else f"Marks unchanged ({old_marks}); audit trigger skipped because OLD = NEW"
        )

        return {
            "message": msg,
            "audit_triggered": audit_triggered,
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

@router.delete("/embeddings/{answer_id}")
def delete_vector_embedding(answer_id: str):
    """
    Directly deletes a vector embedding row from ANSWER_EMBEDDING (demonstrating Vector Delete),
    cascading to dependent SIMILARITY_RESULT rows and recording an AUDIT_LOG entry.
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT embedding_id FROM ANSWER_EMBEDDING WHERE answer_id = %s;",
            (answer_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Embedding not found for answer")

        emb_id = row["embedding_id"]
        cursor.execute(
            "DELETE FROM ANSWER_EMBEDDING WHERE embedding_id = %s;",
            (emb_id,),
        )
        cursor.execute(
            """
            INSERT INTO AUDIT_LOG (entity_name, record_id, action_type, old_val, new_val, performed_by)
            VALUES ('ANSWER_EMBEDDING', %s, 'DELETE_VECTOR', %s, NULL, 'API_VECTOR_DELETE');
            """,
            (emb_id, f"Deleted vector for answer {answer_id}"),
        )

        return {
            "message": f"Vector embedding {emb_id} deleted successfully",
            "embedding_id": emb_id,
            "answer_id": answer_id,
        }
