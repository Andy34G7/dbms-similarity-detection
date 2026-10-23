from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Teacher Schemas
class TeacherBase(BaseModel):
    teacher_id: str
    name: str
    email: str
    dept_name: str = "Computer Science"

# Question Schemas
class QuestionCreate(BaseModel):
    question_id: Optional[str] = None
    question_text: str
    marks: float = 10.00
    sample_solution: str

class QuestionOut(BaseModel):
    question_id: str
    test_id: str
    question_text: str
    marks: float
    sample_solution: Optional[str] = None
    created_at: Optional[datetime] = None

# Test Schemas
class TestCreate(BaseModel):
    test_id: Optional[str] = None
    teacher_id: str
    title: str
    description: Optional[str] = None
    questions: Optional[List[QuestionCreate]] = None

class TestOut(BaseModel):
    test_id: str
    teacher_id: str
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    teacher_department: Optional[str] = None
    test_title: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    total_questions: int = 0
    total_test_marks: float = 0.0
    submission_count: int = 0
    created_at: Optional[datetime] = None

# Answer Submission Schemas
class StudentAnswerInput(BaseModel):
    question_id: str
    answer_text: str

class SubmissionCreate(BaseModel):
    submission_id: Optional[str] = None
    student_id: str
    test_id: str
    answers: List[StudentAnswerInput]

class AnswerOut(BaseModel):
    answer_id: str
    question_id: str
    question_text: Optional[str] = None
    max_marks: Optional[float] = None
    answer_text: str
    marks_awarded: float
    similarity_score: Optional[float] = None
    benchmark_answer_text: Optional[str] = None
    is_reference: bool = False

class SubmissionOut(BaseModel):
    submission_id: str
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    test_id: str
    test_title: Optional[str] = None
    submitted_at: Optional[datetime] = None
    status: str
    total_score: float
    max_test_marks: Optional[float] = None
    percentage_score: Optional[float] = None
    answers: Optional[List[AnswerOut]] = None

# Evaluation Schemas
class EvaluateSubmissionRequest(BaseModel):
    submission_id: str
    threshold_full: Optional[float] = 0.75
    threshold_partial: Optional[float] = 0.50

class PairwisePlagiarismRequest(BaseModel):
    question_id: str
    threshold: Optional[float] = 0.70

class PairwisePlagiarismResult(BaseModel):
    result_id: str
    question_id: str
    question_text: str
    student_1_id: str
    student_1_name: str
    student_1_answer: str
    student_2_id: str
    student_2_name: str
    student_2_answer: str
    similarity_score: float
    collusion_risk: str
