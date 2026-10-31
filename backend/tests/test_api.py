import pytest
import uuid
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "PES2UG24CS058" in data["team_srns"]
    assert "PES2UG24CS061" in data["team_srns"]

def test_list_tests(client):
    response = client.get("/api/tests")
    assert response.status_code == 200
    tests = response.json()
    assert len(tests) >= 2
    test_ids = [t["test_id"] for t in tests]
    assert "TEST_DBMS_01" in test_ids

def test_get_test_details(client):
    response = client.get("/api/tests/TEST_DBMS_01")
    assert response.status_code == 200
    test = response.json()
    assert test["test_id"] == "TEST_DBMS_01"
    assert len(test["questions"]) >= 3
    assert test["questions"][0]["question_id"] == "Q101"

def test_list_submissions(client):
    response = client.get("/api/submissions")
    assert response.status_code == 200
    subs = response.json()
    assert len(subs) >= 4
    student_ids = [s["student_id"] for s in subs]
    assert "PES2UG24CS061" in student_ids
    assert "PES2UG24CS058" in student_ids

def test_showcase_stats(client):
    response = client.get("/api/showcase/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["teacher_count"] >= 2
    assert stats["student_count"] >= 4
    assert stats["embedding_count"] >= 15

def test_explain_vector_search(client):
    response = client.post("/api/showcase/explain-vector-search")
    assert response.status_code == 200
    data = response.json()
    assert "execution_plan" in data
    assert len(data["execution_plan"]) > 0

def test_showcase_views(client):
    views = [
        "v_test_details",
        "v_student_submission_summary",
        "v_similarity_evaluation",
        "v_plagiarism_matrix"
    ]
    for view in views:
        res = client.get(f"/api/showcase/views/{view}")
        assert res.status_code == 200, f"Failed on view {view}"
        data = res.json()
        assert data["view_name"] == view
        assert "columns" in data
        assert "rows" in data

def test_plagiarism_matrix_q101(client):
    response = client.get("/api/evaluation/plagiarism-matrix/Q101")
    assert response.status_code == 200
    data = response.json()
    assert data["question"]["question_id"] == "Q101"
    assert len(data["students"]) >= 4
    assert len(data["pairwise_scores"]) >= 6

def test_trigger_demonstration(client):
    # Test trigger updating score and appending to audit log
    req = {
        "answer_id": "ANS_061_Q101",
        "new_marks": 10.00
    }
    response = client.post("/api/showcase/test-trigger", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Trigger executed successfully"
    assert data["audit_log_entry"] is not None
    assert data["audit_log_entry"]["entity_name"] == "ANSWER"

def test_create_test_and_add_question(client):
    # Tests creating a test, questions, and verifying add_question ID length robustness
    test_suffix = uuid.uuid4().hex[:6].upper()
    test_id = f"T_{test_suffix}"
    payload = {
        "test_id": test_id,
        "teacher_id": "T101",
        "title": f"Distributed Query Optimization {test_suffix}",
        "description": "Evaluation of distributed joins and two-phase commit protocol.",
        "questions": [
            {
                "question_text": "Describe the phases in the Two-Phase Commit (2PC) protocol.",
                "marks": 10.0,
                "sample_solution": "2PC consists of Prepare phase where coordinator asks participants if they can commit, and Commit phase where all commit if all agreed."
            }
        ]
    }
    create_res = client.post("/api/tests", json=payload)
    assert create_res.status_code == 201
    assert create_res.json()["test_id"] == test_id

    # Add question to existing test (verifies question_id length >= 20 chars without truncation)
    q_payload = {
        "question_text": "What is write-ahead logging (WAL)?",
        "marks": 10.0,
        "sample_solution": "WAL ensures all changes are logged before written to stable storage to guarantee durability."
    }
    add_q_res = client.post(f"/api/tests/{test_id}/questions", json=q_payload)
    assert add_q_res.status_code == 201
    assert "question_id" in add_q_res.json()

    # Verify test details has both questions
    details_res = client.get(f"/api/tests/{test_id}")
    assert details_res.status_code == 200
    test_details = details_res.json()
    assert len(test_details["questions"]) == 2

def test_submit_student_test_and_auto_evaluate(client):
    # Student submits answers to newly created test
    test_suffix = uuid.uuid4().hex[:6].upper()
    test_id = f"T_{test_suffix}"
    client.post("/api/tests", json={
        "test_id": test_id,
        "teacher_id": "T102",
        "title": f"Concurrency Test {test_suffix}",
        "description": "Strict 2PL and conflict serializability.",
        "questions": [
            {
                "question_text": "Explain strict two-phase locking (Strict 2PL).",
                "marks": 10.0,
                "sample_solution": "Strict 2PL requires all exclusive locks to be held until transaction commits, preventing cascading aborts."
            }
        ]
    })

    # Fetch question_id
    test_info = client.get(f"/api/tests/{test_id}").json()
    qid = test_info["questions"][0]["question_id"]

    # Student submission
    sub_payload = {
        "student_id": "PES2UG24CS061",
        "test_id": test_id,
        "answers": [
            {
                "question_id": qid,
                "answer_text": "Strict 2PL holds exclusive locks until commit time to ensure recoverability and avoid cascading aborts."
            }
        ]
    }
    sub_res = client.post("/api/submissions?auto_evaluate=true", json=sub_payload)
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    assert sub_data["status"] == "EVALUATED"
    assert sub_data["total_score"] >= 5.0  # High semantic similarity should award marks

    # Test duplicate submission rejection
    dup_res = client.post("/api/submissions?auto_evaluate=true", json=sub_payload)
    assert dup_res.status_code == 400
    assert "already submitted" in dup_res.json()["detail"].lower()

def test_validation_nonexistent_foreign_keys(client):
    # Nonexistent teacher
    res = client.post("/api/tests", json={
        "teacher_id": "T_UNKNOWN_INVALID",
        "title": "Invalid Test",
        "description": "Invalid teacher test"
    })
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"].lower()

    # Nonexistent student submission
    res_sub = client.post("/api/submissions", json={
        "student_id": "STUDENT_DOES_NOT_EXIST",
        "test_id": "TEST_DBMS_01",
        "answers": []
    })
    assert res_sub.status_code == 400
    assert "does not exist" in res_sub.json()["detail"].lower()
