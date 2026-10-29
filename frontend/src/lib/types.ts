export interface Teacher {
  teacher_id: string;
  name: string;
  email: string;
  dept_name: string;
}

export interface Student {
  student_id: string;
  name: string;
  email: string;
}

export interface Question {
  question_id: string;
  test_id: string;
  question_text: string;
  marks: number;
  sample_solution?: string;
  created_at?: string;
}

export interface Test {
  test_id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_email?: string;
  teacher_department?: string;
  test_title?: string;
  title?: string;
  description?: string;
  total_questions: number;
  total_test_marks: number;
  submission_count: number;
  created_at?: string;
  questions?: Question[];
}

export interface AnswerItem {
  answer_id: string;
  question_id: string;
  question_text?: string;
  max_marks?: number;
  answer_text: string;
  marks_awarded: number;
  similarity_score?: number;
  benchmark_answer_text?: string;
  is_reference?: boolean;
}

export interface Submission {
  submission_id: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  test_id: string;
  test_title?: string;
  submitted_at: string;
  status: string;
  total_score: number;
  max_test_marks?: number;
  answered_questions?: number;
  total_questions?: number;
  percentage_score?: number;
  answers?: AnswerItem[];
}

export interface PlagiarismPair {
  result_id: string;
  question_id: string;
  question_text: string;
  student_1_id: string;
  student_1_name: string;
  student_1_answer_id: string;
  student_1_answer_text: string;
  student_2_id: string;
  student_2_name: string;
  student_2_answer_id: string;
  student_2_answer_text: string;
  similarity_score: number;
  collusion_risk: string;
  evaluated_at?: string;
}

export interface PlagiarismHeatmapData {
  question: Question;
  students: {
    student_id: string;
    name: string;
    answer_id: string;
    answer_text: string;
  }[];
  pairwise_scores: Record<string, number>;
}

export interface SystemStats {
  teacher_count: number;
  student_count: number;
  test_count: number;
  question_count: number;
  submission_count: number;
  student_answers_count: number;
  benchmark_answers_count: number;
  embedding_count: number;
  benchmark_similarity_count: number;
  peer_plagiarism_count: number;
  audit_log_count: number;
}

export interface AuditLog {
  log_id: number;
  entity_name: string;
  record_id: string;
  action_type: string;
  old_val: string | null;
  new_val: string | null;
  performed_by: string;
  log_time: string;
}

export interface TriggerTestResult {
  message: string;
  answer_id: string;
  submission_id: string;
  answer_marks: {
    old: number;
    new: number;
  };
  submission_score: {
    before_trigger: number;
    after_trigger: number | null;
    status: string | null;
  };
  audit_log_entry: AuditLog | null;
}

export interface BenchmarkResult {
  result_id: string;
  submission_id: string;
  student_id: string;
  student_name: string;
  question_id: string;
  question_text: string;
  max_marks: number;
  student_answer_id: string;
  student_answer_text: string;
  marks_awarded: number;
  benchmark_answer_id: string;
  benchmark_answer_text: string;
  similarity_score: number;
  comparison_type: string;
  model_name: string;
  evaluated_at: string;
}

export interface ViewInspection {
  view_name: string;
  columns: string[];
  row_count: number;
  rows: Record<string, unknown>[];
}

export interface ExplainResult {
  query: string;
  reference_answer_id: string;
  execution_plan: string[];
}

export interface EvaluationResult {
  message: string;
  data: {
    summary: Submission | null;
    answers: AnswerItem[];
  };
}

export interface PlagiarismStudent {
  student_id: string;
  name: string;
  answer_id: string;
  answer_text: string;
}
