import { 
  Test, 
  Submission, 
  PlagiarismHeatmapData, 
  SystemStats,
  AuditLog,
  TriggerTestResult,
  BenchmarkResult,
  ViewInspection,
  ExplainResult,
  EvaluationResult
} from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API Request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Tests
  getTests: () => fetchJson<Test[]>('/api/tests'),
  getTestDetails: (testId: string) => fetchJson<Test>(`/api/tests/${testId}`),
  createTest: (data: {
    teacher_id: string;
    title: string;
    description: string;
    questions: { question_text: string; marks: number; sample_solution: string }[];
  }) => fetchJson<{ message: string; test_id: string }>('/api/tests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Submissions
  getSubmissions: (studentId?: string, testId?: string) => {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId);
    if (testId) params.append('test_id', testId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Submission[]>(`/api/submissions${query}`);
  },
  getSubmissionDetails: (submissionId: string) =>
    fetchJson<Submission>(`/api/submissions/${submissionId}`),
  submitTest: (data: {
    student_id: string;
    test_id: string;
    answers: { question_id: string; answer_text: string }[];
  }) => fetchJson<{ message: string; submission_id: string; total_score?: number; status?: string }>(
    '/api/submissions?auto_evaluate=true',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  ),

  // Evaluation & Plagiarism
  evaluateSubmission: (submissionId: string, fullThreshold = 0.75, partialThreshold = 0.5) =>
    fetchJson<EvaluationResult>('/api/evaluation/benchmark', {
      method: 'POST',
      body: JSON.stringify({
        submission_id: submissionId,
        threshold_full: fullThreshold,
        threshold_partial: partialThreshold,
      }),
    }),
  batchEvaluateTest: (testId: string) =>
    fetchJson<{ message: string; count: number }>(`/api/evaluation/batch-evaluate/${testId}`, {
      method: 'POST',
    }),
  getPlagiarismMatrix: (questionId: string) =>
    fetchJson<PlagiarismHeatmapData>(`/api/evaluation/plagiarism-matrix/${questionId}`),
  getBenchmarkResults: (testId: string) =>
    fetchJson<BenchmarkResult[]>(`/api/evaluation/benchmark-results/${testId}`),

  // Showcase
  getViewData: (viewName: string) =>
    fetchJson<ViewInspection>(`/api/showcase/views/${viewName}`),
  explainVectorSearch: () =>
    fetchJson<ExplainResult>('/api/showcase/explain-vector-search', { method: 'POST' }),
  getAuditLogs: () => fetchJson<AuditLog[]>('/api/showcase/audit-logs'),
  testTriggerDemo: (answerId: string, newMarks: number) =>
    fetchJson<TriggerTestResult>('/api/showcase/test-trigger', {
      method: 'POST',
      body: JSON.stringify({ answer_id: answerId, new_marks: newMarks }),
    }),
  getStats: () => fetchJson<SystemStats>('/api/showcase/stats'),
};
