'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Test, Submission } from '../lib/types';
import { useRole } from '../context/RoleContext';
import { 
  BookOpen, 
  CheckCircle2, 
  PenTool, 
  Send, 
  Eye, 
  Award, 
  ArrowLeft,
  X
} from 'lucide-react';

export const StudentView: React.FC = () => {
  const { currentUser } = useRole();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Test Taking State
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [prevUser, setPrevUser] = useState(currentUser.id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    message: string;
    submission_id: string;
    total_score?: number;
    status?: string;
  } | null>(null);

  // Reset active test when student switches
  if (currentUser.id !== prevUser) {
    setPrevUser(currentUser.id);
    setActiveTest(null);
  }

  // Inspection Modal
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null);

  const refreshData = async () => {
    try {
      const [testsData, subsData] = await Promise.all([
        api.getTests(),
        api.getSubmissions(currentUser.id),
      ]);
      setTests(testsData);
      setSubmissions(subsData);
    } catch (err) {
      console.error('Failed to load student data:', err);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [testsData, subsData] = await Promise.all([
          api.getTests(),
          api.getSubmissions(currentUser.id),
        ]);
        if (active) {
          setTests(testsData);
          setSubmissions(subsData);
        }
      } catch (err) {
        console.error('Failed to load student data:', err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const handleStartTest = async (testId: string) => {
    try {
      const fullTest = await api.getTestDetails(testId);
      setActiveTest(fullTest);
      const initialAnswers: Record<string, string> = {};
      fullTest.questions?.forEach((q) => {
        initialAnswers[q.question_id] = '';
      });
      setAnswers(initialAnswers);
    } catch (err: unknown) {
      alert(`Could not load test details: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest) return;

    // Check all questions answered
    const formattedAnswers = Object.entries(answers).map(([qid, text]) => ({
      question_id: qid,
      answer_text: text,
    }));

    const empty = formattedAnswers.some((a) => !a.answer_text.trim());
    if (empty) {
      if (!confirm('Some answers are empty. Are you sure you want to submit?')) return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitTest({
        student_id: currentUser.id,
        test_id: activeTest.test_id,
        answers: formattedAnswers,
      });
      setSubmissionSuccess(res);
      setActiveTest(null);
      await refreshData();
    } catch (err: unknown) {
      alert(`Error submitting test: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSubmitted = (testId: string) => {
    return submissions.some((s) => s.test_id === testId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 sm:p-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Authenticated as {currentUser.name} ({currentUser.deptOrSRN})
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">
              Assessment Console
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Complete assigned subjective DBMS assessments evaluated using pgvector dense vector embeddings
              against teacher benchmark solutions with cosine similarity.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-slate-50 dark:bg-[#141722] border border-slate-200/80 dark:border-white/[0.06] px-3.5 py-2 rounded-lg text-center transition-colors">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Submissions</div>
              <div className="text-base font-semibold text-slate-900 dark:text-white font-mono tabular-nums">{submissions.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Test Taking Screen */}
      {activeTest ? (
        <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-2xl p-6 sm:p-7 relative transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-4 mb-6">
            <button
              onClick={() => setActiveTest(null)}
              className="btn-press flex items-center ps-2.5 pe-3 gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to tests</span>
            </button>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total marks</span>
              <div className="text-base font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                {activeTest.total_test_marks}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Test ID: {activeTest.test_id}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {activeTest.test_title || activeTest.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{activeTest.description}</p>
          </div>

          <form onSubmit={handleSubmitTest} className="space-y-5">
            {activeTest.questions?.map((q, idx) => {
              const text = answers[q.question_id] || '';
              const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
              return (
                <div key={q.question_id} className="bg-slate-50 dark:bg-[#141722] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-4 sm:p-5 space-y-3 transition-colors">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                      Question #{idx + 1} ({q.question_id})
                    </span>
                    <span className="text-xs bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md font-mono tabular-nums">
                      {q.marks} Marks
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200 leading-relaxed">{q.question_text}</p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1.5">
                      Your Technical Explanation:
                    </label>
                    <textarea
                      rows={5}
                      value={answers[q.question_id] || ''}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.question_id]: e.target.value })
                      }
                      placeholder="Write your detailed technical answer here..."
                      className="w-full bg-white dark:bg-[#0c0d13] border border-slate-300 dark:border-white/[0.08] focus:border-slate-500 dark:focus:border-white/30 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-sans leading-relaxed"
                      required
                    />
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Express key architectural concepts, trade-offs, and terminology.</span>
                      <span className="font-mono tabular-nums">{wordCount} words • {text.length} chars</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveTest(null)}
                className="btn-press px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel attempt
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-press flex items-center ps-3.5 pe-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 py-2 rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Generating embeddings and evaluating...' : 'Submit for evaluation'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Available Tests */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Available Tests</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tests assigned to your section
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map((test) => {
                const submitted = hasSubmitted(test.test_id);
                return (
                  <div
                    key={test.test_id}
                    className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16] rounded-xl p-5 shadow-sm flex flex-col justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          ID: {test.test_id}
                        </span>
                        <span>Instructor: {test.teacher_name}</span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                        {test.test_title || test.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {test.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200/80 dark:border-white/[0.06] mb-4">
                        <div>
                          Questions: <span className="text-slate-900 dark:text-white font-mono tabular-nums font-semibold">{test.total_questions}</span>
                        </div>
                        <div>•</div>
                        <div>
                          Max Marks: <span className="text-slate-900 dark:text-white font-mono tabular-nums font-semibold">{test.total_test_marks}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {submitted ? (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                          <span className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Attempt Completed
                          </span>
                          <button
                            onClick={async () => {
                              const sub = submissions.find((s) => s.test_id === test.test_id);
                              if (sub) {
                                const details = await api.getSubmissionDetails(sub.submission_id);
                                setInspectSubmission(details);
                              }
                            }}
                            className="btn-press text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] transition-colors"
                          >
                            View Result
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartTest(test.test_id)}
                          className="btn-press w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Start Test Attempt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Submissions History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>My Evaluated Submissions</span>
              </h3>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No test submissions found for {currentUser.name}. Take a test above to generate your first vector evaluation.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm transition-colors">
                <div className="overflow-x-auto contain-scroll">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-[#141722] text-slate-500 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                      <tr>
                        <th className="px-5 py-3">Test Title</th>
                        <th className="px-5 py-3">Submission ID</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Total Score</th>
                        <th className="px-5 py-3">Percentage</th>
                        <th className="px-5 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {submissions.map((sub) => (
                        <tr key={sub.submission_id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-150">
                          <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                            {sub.test_title}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {sub.submission_id}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${
                                sub.status === 'EVALUATED'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                              }`}
                            >
                              {sub.status === 'EVALUATED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
                            {sub.total_score} / {sub.max_test_marks || 30.0}
                          </td>
                          <td className="px-5 py-3.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {sub.percentage_score || 0}%
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={async () => {
                                const details = await api.getSubmissionDetails(sub.submission_id);
                                setInspectSubmission(details);
                              }}
                              className="btn-press inline-flex items-center ps-2.5 pe-3 gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-200 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/[0.08] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>View Breakdown</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Success Dialog */}
      {submissionSuccess && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 contain-scroll">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative contain-scroll transition-colors">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">Test Evaluated Successfully</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              Your subjective answers were transformed into 384-dimensional dense vectors
              and compared against the teacher benchmark solution.
            </p>
            <div className="bg-slate-50 dark:bg-[#141722] p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] mb-5 text-left space-y-1.5 text-xs">
              <div className="text-slate-600 dark:text-slate-400">
                Submission ID: <strong className="text-slate-900 dark:text-white font-mono">{submissionSuccess.submission_id}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Automated Score: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{submissionSuccess.total_score} Marks</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Status: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{submissionSuccess.status}</span>
              </div>
            </div>
            <button
              onClick={() => setSubmissionSuccess(null)}
              className="btn-press w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 py-2.5 rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Result Inspector Modal */}
      {inspectSubmission && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto contain-scroll">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto contain-scroll relative transition-colors">
            <button
              onClick={() => setInspectSubmission(null)}
              className="btn-press absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 dark:border-white/[0.06] pb-4 mb-6">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Submission ID: {inspectSubmission.submission_id}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                {inspectSubmission.test_title}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span>Total Score: <strong className="text-slate-900 dark:text-white font-mono">{inspectSubmission.total_score} / {inspectSubmission.max_test_marks || 30.0}</strong></span>
                <span>•</span>
                <span>Percentage: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{inspectSubmission.percentage_score}%</strong></span>
              </div>
            </div>

            {/* Answer Breakdown */}
            <div className="space-y-4">
              {inspectSubmission.answers?.map((ans, idx) => (
                <div key={ans.answer_id} className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                      Question #{idx + 1} ({ans.question_id})
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-white dark:bg-[#0c0d13] text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-mono border border-slate-200 dark:border-white/[0.06]">
                        Similarity Match: <strong className="text-slate-900 dark:text-white">{ans.similarity_score ? (ans.similarity_score * 100).toFixed(1) : 0}%</strong>
                      </span>
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md font-mono font-medium">
                        {ans.marks_awarded} / {ans.max_marks || 10.0} Marks
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                    {ans.question_text}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Student answer */}
                    <div className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] p-3 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Your Submitted Answer:</div>
                      <p className="text-slate-800 dark:text-slate-300 leading-relaxed">&quot;{ans.answer_text}&quot;</p>
                    </div>

                    {/* Teacher Benchmark Answer */}
                    <div className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] p-3 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher Reference Model:</div>
                      <p className="text-slate-800 dark:text-slate-300 leading-relaxed">&quot;{ans.benchmark_answer_text}&quot;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
