from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from db import get_db_cursor
from models import EvaluateSubmissionRequest, PairwisePlagiarismRequest
from services.evaluation_service import evaluation_service

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation & Similarity"])

@router.post("/benchmark")
def evaluate_single_submission(req: EvaluateSubmissionRequest):
    """
    Evaluates a student submission against benchmark answers using pgvector cosine distance.
    Invokes stored procedure sp_evaluate_submission and triggers score recalculation.
    """
    try:
        result = evaluation_service.evaluate_submission(
            req.submission_id,
            req.threshold_full,
            req.threshold_partial
        )
        return {
            "message": "Submission evaluated successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-evaluate/{test_id}")
def batch_evaluate_test(test_id: str):
    """Evaluates all student submissions for a given test."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT submission_id FROM SUBMISSION 
            WHERE test_id = %s AND student_id != 'REF_BENCHMARK';
        """, (test_id,))
        submissions = cursor.fetchall()

    results = []
    for s in submissions:
        res = evaluation_service.evaluate_submission(s["submission_id"])
        results.append(res)

    return {
        "message": f"Successfully evaluated {len(results)} submissions for test {test_id}",
        "count": len(results)
    }

@router.post("/pairwise-plagiarism")
def run_pairwise_plagiarism(req: PairwisePlagiarismRequest):
    """
    Runs peer-to-peer pairwise vector similarity search across all student answers
    for a given question using pgvector HNSW index.
    """
    try:
        matrix = evaluation_service.compute_pairwise_plagiarism(req.question_id, req.threshold)
        return {
            "question_id": req.question_id,
            "pairs_evaluated": len(matrix),
            "plagiarism_flags": matrix
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plagiarism-matrix/{question_id}")
def get_plagiarism_matrix(question_id: str):
    """
    Returns full N x N pairwise student similarity matrix for interactive heatmap rendering.
    """
    try:
        return evaluation_service.get_question_heatmap_data(question_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmark-results/{test_id}")
def get_benchmark_results(test_id: str):
    """Fetches benchmark similarity evaluations from v_similarity_evaluation view."""
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT v.* 
            FROM v_similarity_evaluation v
            JOIN QUESTION q ON v.question_id = q.question_id
            WHERE q.test_id = %s
            ORDER BY v.question_id ASC, v.similarity_score DESC;
        """, (test_id,))
        results = cursor.fetchall()
        return [dict(r) for r in results]
