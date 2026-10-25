from db import get_db_cursor
from config import settings
from services.embedding_service import embedding_service
from typing import Dict, Any, List

class EvaluationService:
    @staticmethod
    def evaluate_submission(
        submission_id: str, 
        threshold_full: float = None, 
        threshold_partial: float = None
    ) -> Dict[str, Any]:
        """
        Calculates cosine similarity between each student answer and its benchmark reference answer
        using PostgreSQL pgvector <=> operator, writes to SIMILARITY_RESULT, and invokes
        sp_evaluate_submission to trigger automated score recalculation via trigger.
        """
        if threshold_full is None:
            threshold_full = settings.SIMILARITY_FULL_THRESHOLD
        if threshold_partial is None:
            threshold_partial = settings.SIMILARITY_PARTIAL_THRESHOLD

        # 1. Sync embeddings
        embedding_service.sync_missing_embeddings()

        with get_db_cursor(commit=True) as cursor:
            # 2. Find benchmark reference answer for each question in this submission
            cursor.execute("""
                SELECT 
                    a.answer_id AS student_answer_id,
                    ae.embedding_id AS student_embedding_id,
                    q.question_id,
                    ref_a.answer_id AS ref_answer_id,
                    ref_ae.embedding_id AS ref_embedding_id,
                    ROUND(GREATEST(0.0000, LEAST(1.0000, (1 - (ae.embedding <=> ref_ae.embedding))::numeric)), 4) AS cosine_similarity
                FROM ANSWER a
                JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
                JOIN QUESTION q ON a.question_id = q.question_id
                JOIN ANSWER ref_a ON q.question_id = ref_a.question_id AND ref_a.is_reference = TRUE
                JOIN ANSWER_EMBEDDING ref_ae ON ref_a.answer_id = ref_ae.answer_id
                WHERE a.submission_id = %s;
            """, (submission_id,))
            evaluations = cursor.fetchall()

            # 3. Store benchmark results into SIMILARITY_RESULT
            for row in evaluations:
                res_id = f"RES_BENCH_{row['student_answer_id']}"
                cursor.execute("""
                    INSERT INTO SIMILARITY_RESULT (
                        result_id, embedding_id, compared_answer_id, similarity_score, comparison_type
                    )
                    VALUES (%s, %s, %s, %s, 'BENCHMARK')
                    ON CONFLICT (result_id, embedding_id)
                    DO UPDATE SET 
                        similarity_score = EXCLUDED.similarity_score,
                        evaluated_at = CURRENT_TIMESTAMP;
                """, (
                    res_id, 
                    row['student_embedding_id'], 
                    row['ref_answer_id'], 
                    row['cosine_similarity']
                ))

            # 4. Invoke stored procedure sp_evaluate_submission to assign marks & fire triggers
            cursor.execute("""
                CALL sp_evaluate_submission(%s, %s, %s);
            """, (submission_id, threshold_full, threshold_partial))

            # 5. Fetch updated submission summary from view
            cursor.execute("""
                SELECT * FROM v_student_submission_summary WHERE submission_id = %s;
            """, (submission_id,))
            summary = cursor.fetchone()

            # 6. Fetch detailed answers with marks and similarities
            cursor.execute("""
                SELECT 
                    a.answer_id,
                    a.question_id,
                    q.question_text,
                    q.marks AS max_marks,
                    a.answer_text,
                    a.marks_awarded,
                    sr.similarity_score,
                    ref_a.answer_text AS benchmark_answer_text
                FROM ANSWER a
                JOIN QUESTION q ON a.question_id = q.question_id
                LEFT JOIN ANSWER ref_a ON q.question_id = ref_a.question_id AND ref_a.is_reference = TRUE
                LEFT JOIN ANSWER_EMBEDDING ae ON a.answer_id = ae.answer_id
                LEFT JOIN SIMILARITY_RESULT sr ON ae.embedding_id = sr.embedding_id AND sr.comparison_type = 'BENCHMARK'
                WHERE a.submission_id = %s
                ORDER BY q.question_id ASC;
            """, (submission_id,))
            answers = cursor.fetchall()

            return {
                "summary": dict(summary) if summary else None,
                "answers": [dict(a) for a in answers]
            }

    @staticmethod
    def compute_pairwise_plagiarism(question_id: str, threshold: float = None) -> List[Dict[str, Any]]:
        """
        Runs student-to-student pairwise vector similarity comparison using pgvector.
        Detects collusion/plagiarism across all non-reference submissions for a question.
        """
        if threshold is None:
            threshold = settings.PLAGIARISM_MODERATE_THRESHOLD

        embedding_service.sync_missing_embeddings()

        with get_db_cursor(commit=True) as cursor:
            # 1. Compute pairwise similarity using vector_cosine_ops (<=> operator)
            cursor.execute("""
                SELECT 
                    a1.answer_id AS a1_id,
                    ae1.embedding_id AS ae1_id,
                    a2.answer_id AS a2_id,
                    ROUND(GREATEST(0.0000, LEAST(1.0000, (1 - (ae1.embedding <=> ae2.embedding))::numeric)), 4) AS similarity_score
                FROM ANSWER a1
                JOIN ANSWER_EMBEDDING ae1 ON a1.answer_id = ae1.answer_id
                JOIN ANSWER a2 ON a1.question_id = a2.question_id AND a1.answer_id != a2.answer_id
                JOIN ANSWER_EMBEDDING ae2 ON a2.answer_id = ae2.answer_id
                WHERE a1.question_id = %s
                  AND a1.is_reference = FALSE
                  AND a2.is_reference = FALSE;
            """, (question_id,))
            pairs = cursor.fetchall()

            # 2. Insert into SIMILARITY_RESULT as PEER_PLAGIARISM
            for p in pairs:
                combined_key = f"{p['a1_id']}_{p['a2_id']}"
                if len(combined_key) > 75:
                    import hashlib
                    h = hashlib.md5(combined_key.encode()).hexdigest()[:24]
                    res_id = f"RES_PLAG_{h}"
                else:
                    res_id = f"RES_PLAG_{combined_key}"

                cursor.execute("""
                    INSERT INTO SIMILARITY_RESULT (
                        result_id, embedding_id, compared_answer_id, similarity_score, comparison_type
                    )
                    VALUES (%s, %s, %s, %s, 'PEER_PLAGIARISM')
                    ON CONFLICT (result_id, embedding_id)
                    DO UPDATE SET 
                        similarity_score = EXCLUDED.similarity_score,
                        evaluated_at = CURRENT_TIMESTAMP;
                """, (res_id, p['ae1_id'], p['a2_id'], p['similarity_score']))

            # 3. Query v_plagiarism_matrix for the question
            cursor.execute("""
                SELECT * FROM v_plagiarism_matrix
                WHERE question_id = %s
                ORDER BY similarity_score DESC;
            """, (question_id,))
            matrix_rows = cursor.fetchall()

            return [dict(r) for r in matrix_rows]

    @staticmethod
    def get_question_heatmap_data(question_id: str) -> Dict[str, Any]:
        """
        Constructs full student matrix grid (students list and pairwise scores)
        for heatmap rendering on frontend.
        """
        # Ensure pairwise results are computed
        EvaluationService.compute_pairwise_plagiarism(question_id)

        with get_db_cursor(commit=False) as cursor:
            # Get question info
            cursor.execute("SELECT question_id, test_id, question_text, marks FROM QUESTION WHERE question_id = %s;", (question_id,))
            q_info = cursor.fetchone()

            # Get all students who submitted for this question
            cursor.execute("""
                SELECT DISTINCT 
                    st.student_id, 
                    st.name, 
                    a.answer_id, 
                    a.answer_text
                FROM ANSWER a
                JOIN SUBMISSION s ON a.submission_id = s.submission_id
                JOIN STUDENT st ON s.student_id = st.student_id
                WHERE a.question_id = %s AND a.is_reference = FALSE
                ORDER BY st.student_id ASC;
            """, (question_id,))
            students = [dict(s) for s in cursor.fetchall()]

            # Get pairwise comparisons
            cursor.execute("""
                SELECT 
                    a1.answer_id AS a1_id,
                    a2.answer_id AS a2_id,
                    sr.similarity_score
                FROM SIMILARITY_RESULT sr
                JOIN ANSWER_EMBEDDING ae ON sr.embedding_id = ae.embedding_id
                JOIN ANSWER a1 ON ae.answer_id = a1.answer_id
                JOIN ANSWER a2 ON sr.compared_answer_id = a2.answer_id
                WHERE a1.question_id = %s AND sr.comparison_type = 'PEER_PLAGIARISM';
            """, (question_id,))
            scores_raw = cursor.fetchall()

            score_map = {}
            for s in scores_raw:
                score_map[f"{s['a1_id']}_{s['a2_id']}"] = float(s['similarity_score'])

            return {
                "question": dict(q_info) if q_info else None,
                "students": students,
                "pairwise_scores": score_map
            }

evaluation_service = EvaluationService()
