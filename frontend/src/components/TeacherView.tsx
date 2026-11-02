'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Test, Submission, PlagiarismHeatmapData, PlagiarismStudent } from '../lib/types';
import { useRole } from '../context/RoleContext';
import { 
  PlusCircle, 
  RefreshCw, 
  Cpu, 
  CheckCircle2, 
  Eye, 
  Flame, 
  X, 
  Sliders,
  AlertTriangle,
  Trash2,
  Search
} from 'lucide-react';

export const TeacherView: React.FC = () => {
  const { currentUser } = useRole();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tests' | 'submissions' | 'plagiarism'>('tests');

  // Modals & Inspection States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('Q101');
  const [heatmapData, setHeatmapData] = useState<PlagiarismHeatmapData | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [selectedPair, setSelectedPair] = useState<{
    s1: PlagiarismStudent;
    s2: PlagiarismStudent;
    score: number;
  } | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EVALUATED' | 'PENDING'>('ALL');

  // New Test Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQuestions, setNewQuestions] = useState([
    { question_text: '', marks: 10, sample_solution: '' }
  ]);
  const [submittingTest, setSubmittingTest] = useState(false);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [testsData, subsData] = await Promise.all([
        api.getTests(),
        api.getSubmissions()
      ]);
      setTests(testsData);
      setSubmissions(subsData);
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [testsData, subsData] = await Promise.all([
          api.getTests(),
          api.getSubmissions()
        ]);
        if (active) {
          setTests(testsData);
          setSubmissions(subsData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load teacher data:', err);
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const loadHeatmap = async (qid: string) => {
    try {
      setLoadingHeatmap(true);
      setSelectedQuestionId(qid);
      const data = await api.getPlagiarismMatrix(qid);
      setHeatmapData(data);
      setSelectedPair(null);
    } catch (err) {
      console.error('Failed to load heatmap:', err);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (activeTab === 'plagiarism') {
      api.getPlagiarismMatrix(selectedQuestionId)
        .then((data) => {
          if (active) {
            setHeatmapData(data);
            setSelectedPair(null);
          }
        })
        .catch((err) => console.error('Failed to load heatmap:', err));
    }
    return () => {
      active = false;
    };
  }, [activeTab, selectedQuestionId]);

  const handleBatchEvaluate = async (testId: string) => {
    try {
      await api.batchEvaluateTest(testId);
      await refreshData();
      alert(`Automated pgvector evaluation completed for test ${testId}!`);
    } catch (err: unknown) {
      alert(`Evaluation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm(`Are you sure you want to delete test ${testId}? This cascades to all questions, submissions, answers, embeddings, and similarity records.`)) {
      return;
    }
    try {
      await api.deleteTest(testId);
      await refreshData();
    } catch (err: unknown) {
      alert(`Failed to delete test: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm(`Are you sure you want to delete submission ${submissionId}?`)) {
      return;
    }
    try {
      await api.deleteSubmission(submissionId);
      await refreshData();
    } catch (err: unknown) {
      alert(`Failed to delete submission: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return alert('Please enter test title');
    try {
      setSubmittingTest(true);
      await api.createTest({
        teacher_id: currentUser.id.startsWith('T') ? currentUser.id : 'T101',
        title: newTitle,
        description: newDesc,
        questions: newQuestions,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewQuestions([{ question_text: '', marks: 10, sample_solution: '' }]);
      await refreshData();
      alert('New test and benchmark solution key initialized successfully!');
    } catch (err: unknown) {
      alert(`Error creating test: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleManualMarkUpdate = async (answerId: string, currentMark: number) => {
    const input = prompt('Enter new marks to award (Demonstrates trg_recalculate_submission_score):', String(currentMark));
    if (input === null) return;
    const newMark = parseFloat(input);
    if (isNaN(newMark) || newMark < 0) return alert('Invalid mark value');

    try {
      const res = await api.testTriggerDemo(answerId, newMark);
      alert(
        `Trigger Fired!\n- Answer marks updated: ${res.answer_marks.old} -> ${res.answer_marks.new}\n- Submission total recalculated: ${res.submission_score.before_trigger} -> ${res.submission_score.after_trigger}\n- Audit Log entry created: Log #${res.audit_log_entry?.log_id}`
      );
      if (inspectSubmission) {
        const updatedSub = await api.getSubmissionDetails(inspectSubmission.submission_id);
        setInspectSubmission(updatedSub);
      }
      await refreshData();
    } catch (err: unknown) {
      alert(`Error updating mark: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredSubmissions = submissions.filter((sub: Submission) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      (sub.student_name?.toLowerCase() || '').includes(query) ||
      (sub.student_id?.toLowerCase() || '').includes(query) ||
      (sub.test_title?.toLowerCase() || '').includes(query);
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 sm:p-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Authenticated as {currentUser.name} ({currentUser.id})
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-1">
              Test Management and Similarity Detection
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Manage tests, trigger batch evaluation, and inspect collusion matrices.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-press flex items-center ps-3 pe-3.5 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Test</span>
            </button>
            <button
              onClick={refreshData}
              className="btn-press p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/[0.08] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 mt-6 border-b border-slate-200 dark:border-white/[0.06] pt-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tests')}
            className={`btn-press px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Tests and Question Banks ({tests.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`btn-press px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'submissions'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Submissions and Auto-Grades ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('plagiarism')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'plagiarism'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Pairwise Plagiarism Matrix</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Tests List */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => (
            <div
              key={test.test_id}
              className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16] rounded-xl p-5 shadow-sm flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    ID: {test.test_id}
                  </span>
                  <span>Teacher: {test.teacher_name}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                  {test.test_title || test.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {test.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-[#141722] rounded-lg p-3 text-center border border-slate-200/80 dark:border-white/[0.06] mb-4">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Questions</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white font-mono tabular-nums">{test.total_questions}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Marks</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white font-mono tabular-nums">{test.total_test_marks}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Submissions</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white font-mono tabular-nums">{test.submission_count}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  onClick={() => handleBatchEvaluate(test.test_id)}
                  className="btn-press flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Batch Auto-Grade</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('submissions');
                  }}
                  className="btn-press px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:text-slate-300 border border-slate-200 dark:border-white/[0.06] rounded-lg text-xs font-medium transition-colors"
                >
                  View Submissions
                </button>
                <button
                  onClick={() => handleDeleteTest(test.test_id)}
                  className="btn-press p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 rounded-lg transition-colors"
                  title="Delete Test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Submissions Table */}
      {activeTab === 'submissions' && (
        <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white text-xs shrink-0">
              Student Test Submissions ({filteredSubmissions.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student, SRN, or test..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-8 pe-3 py-1 bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.08] rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 w-48 sm:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'EVALUATED' | 'PENDING')}
                className="px-2.5 py-1 bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.08] rounded-md text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="EVALUATED">Evaluated</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto contain-scroll">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-[#141722] text-slate-500 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">Student &amp; SRN</th>
                  <th className="px-5 py-3">Test Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Score Awarded</th>
                  <th className="px-5 py-3">Percentage</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs">
                      No submissions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub: Submission) => (
                    <tr key={sub.submission_id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-150">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{sub.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{sub.student_id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 dark:text-slate-200">{sub.test_title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: {sub.submission_id}</div>
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
                      <td className="px-5 py-3.5 font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                        {sub.total_score} / {sub.max_test_marks || 30.0}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-200 dark:bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (sub.percentage_score || 0) >= 75
                                  ? 'bg-emerald-500 dark:bg-emerald-400'
                                  : (sub.percentage_score || 0) >= 50
                                  ? 'bg-amber-500 dark:bg-amber-400'
                                  : 'bg-rose-500 dark:bg-rose-400'
                              }`}
                              style={{ width: `${Math.min(sub.percentage_score || 0, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {sub.percentage_score || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right flex items-center justify-end space-x-1">
                        <button
                          onClick={async () => {
                            const details = await api.getSubmissionDetails(sub.submission_id);
                            setInspectSubmission(details);
                          }}
                          className="btn-press inline-flex items-center ps-2.5 pe-3 gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-200 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/[0.08] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Inspect &amp; Grade</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubmission(sub.submission_id)}
                          className="btn-press p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Pairwise Plagiarism Matrix Heatmap */}
      {activeTab === 'plagiarism' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Student Pairwise Similarity Heatmap</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Full N × N cosine distance comparison across peer answers for collusion and plagiarism detection.
                </p>
              </div>

              {/* Question selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Question:</span>
                {['Q101', 'Q102', 'Q103'].map((qid) => (
                  <button
                    key={qid}
                    onClick={() => loadHeatmap(qid)}
                    className={`btn-press px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      selectedQuestionId === qid
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-medium shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:text-white dark:border-white/[0.06]'
                    }`}
                  >
                    {qid}
                  </button>
                ))}
              </div>
            </div>

            {loadingHeatmap ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-mono">Computing pairwise pgvector distance matrix...</span>
              </div>
            ) : heatmapData && heatmapData.students.length > 0 ? (
              <div className="space-y-6">
                {/* Question Text Card */}
                <div className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                    Question: {heatmapData.question?.question_id} ({heatmapData.question?.marks} Marks)
                  </div>
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {heatmapData.question?.question_text}
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div className="overflow-x-auto contain-scroll">
                  <table className="border-collapse mx-auto">
                    <thead>
                      <tr>
                        <th className="p-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-right pr-4">
                          Student
                        </th>
                        {heatmapData.students.map((s) => (
                          <th key={s.student_id} className="p-2 text-xs font-medium text-slate-700 dark:text-slate-300 text-center w-28">
                            <div>{s.name.split(' ')[0]}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{s.student_id.slice(-5)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.students.map((s1) => (
                        <tr key={s1.student_id}>
                          <td className="p-2 text-xs font-medium text-slate-700 dark:text-slate-300 text-right pr-4 whitespace-nowrap">
                            <span className="text-slate-900 dark:text-white font-semibold">{s1.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">{s1.student_id}</span>
                          </td>
                          {heatmapData.students.map((s2) => {
                            if (s1.student_id === s2.student_id) {
                              return (
                                <td key={s2.student_id} className="p-1">
                                  <div className="h-12 w-28 rounded-lg bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-mono">
                                    <span>-</span>
                                    <span className="text-[9px]">Self</span>
                                  </div>
                                </td>
                              );
                            }

                            const key = `${s1.answer_id}_${s2.answer_id}`;
                            const altKey = `${s2.answer_id}_${s1.answer_id}`;
                            const score = heatmapData.pairwise_scores[key] ?? heatmapData.pairwise_scores[altKey] ?? 0;
                            const pct = Math.round(score * 10000) / 100;

                            // Calibrated semantic thresholding
                            const isHigh = score >= 0.85;
                            const isModerate = score >= 0.65 && score < 0.85;
                            const isSelected =
                              selectedPair &&
                              ((selectedPair.s1.student_id === s1.student_id && selectedPair.s2.student_id === s2.student_id) ||
                               (selectedPair.s1.student_id === s2.student_id && selectedPair.s2.student_id === s1.student_id));

                            return (
                              <td key={s2.student_id} className="p-1">
                                <button
                                  onClick={() => setSelectedPair({ s1, s2, score })}
                                  className={`btn-press h-12 w-28 rounded-lg flex flex-col items-center justify-center p-1 transition-colors ${
                                    isSelected ? 'ring-2 ring-slate-900 dark:ring-white shadow-md' : ''
                                  } ${
                                    isHigh
                                      ? 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-semibold dark:bg-rose-950/40 dark:hover:bg-rose-950/60 dark:border-rose-800/40 dark:text-rose-300'
                                      : isModerate
                                      ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-800/40 dark:text-amber-300'
                                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-[#141722] dark:hover:bg-[#1a1e2b] dark:border-white/[0.06] dark:text-slate-300'
                                  }`}
                                >
                                  <span className="text-xs font-medium font-mono tabular-nums">{pct}%</span>
                                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                    {isHigh ? 'High Risk' : isModerate ? 'Moderate' : 'Unique'}
                                  </span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Heatmap Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 dark:bg-white/[0.06] dark:border-white/[0.1]"></span>
                    <span>&lt; 65% (Independent answers)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40"></span>
                    <span>65% - 84% (Moderate semantic overlap)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40"></span>
                    <span className="text-rose-700 dark:text-rose-400 font-medium">≥ 85% (High peer collusion alert)</span>
                  </div>
                </div>

                {/* Side-by-Side Comparison Inspector */}
                {selectedPair && (
                  <div className="bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-xl mt-6 relative transition-colors">
                    <button
                      onClick={() => setSelectedPair(null)}
                      className="btn-press absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pr-8">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2 mt-0.5">
                          <span>{selectedPair.s1.name}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">vs</span>
                          <span>{selectedPair.s2.name}</span>
                        </h4>
                      </div>
                      <div className="sm:text-right">
                        <div className="text-xl font-semibold font-mono text-slate-900 dark:text-white tabular-nums">
                          {(selectedPair.score * 100).toFixed(2)}%
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
                            selectedPair.score >= 0.85
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {selectedPair.score >= 0.85 ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>High Collusion Flag</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Independent Variant</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Student 1 Answer */}
                      <div className="bg-slate-50 dark:bg-[#171a25] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{selectedPair.s1.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{selectedPair.s1.student_id}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                          &quot;{selectedPair.s1.answer_text}&quot;
                        </p>
                      </div>

                      {/* Student 2 Answer */}
                      <div className="bg-slate-50 dark:bg-[#171a25] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{selectedPair.s2.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{selectedPair.s2.student_id}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                          &quot;{selectedPair.s2.answer_text}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                No submissions available for this question to calculate pairwise similarity.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Inspector Modal */}
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
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {inspectSubmission.submission_id}</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                {inspectSubmission.student_name} ({inspectSubmission.student_id})
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span>Test: {inspectSubmission.test_title}</span>
                <span>•</span>
                <span>Total Score: <strong className="text-slate-900 dark:text-white font-mono">{inspectSubmission.total_score}</strong> marks</span>
                <span>•</span>
                <span>Status: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{inspectSubmission.status}</span></span>
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
                        Similarity: <strong className="text-slate-900 dark:text-white">{ans.similarity_score ? (ans.similarity_score * 100).toFixed(1) : 0}%</strong>
                      </span>
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md font-mono font-medium">
                        {ans.marks_awarded} / {ans.max_marks || 10.0} Marks
                      </span>
                      <button
                        onClick={() => handleManualMarkUpdate(ans.answer_id, ans.marks_awarded)}
                        className="btn-press p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-300 rounded-md text-xs border border-slate-200 dark:border-white/[0.08]"
                        title="Override marks & trigger auto total_score recalculation"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
                    {ans.question_text}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Student answer */}
                    <div className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] p-3 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Student Answer:</div>
                      <p className="text-slate-800 dark:text-slate-300 leading-relaxed">&quot;{ans.answer_text}&quot;</p>
                    </div>

                    {/* Benchmark reference answer */}
                    <div className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] p-3 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher Reference Benchmark:</div>
                      <p className="text-slate-800 dark:text-slate-300 leading-relaxed">&quot;{ans.benchmark_answer_text}&quot;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto contain-scroll">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative contain-scroll transition-colors">
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn-press absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Create New Test &amp; Benchmark Key</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
              Define the test title and author reference answers for automated vector similarity evaluation.
            </p>

            <form onSubmit={handleCreateTestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Test Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. DBMS ISA2: Query Processing &amp; Normalization"
                  className="w-full bg-white dark:bg-[#141722] border border-slate-300 dark:border-white/[0.08] focus:border-slate-500 dark:focus:border-white/30 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Test overview and topics assessed..."
                  rows={2}
                  className="w-full bg-white dark:bg-[#141722] border border-slate-300 dark:border-white/[0.08] focus:border-slate-500 dark:focus:border-white/30 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Questions Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Questions &amp; Model Benchmark Answers
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewQuestions([
                        ...newQuestions,
                        { question_text: '', marks: 10, sample_solution: '' }
                      ])
                    }
                    className="btn-press text-xs text-slate-900 dark:text-white hover:underline font-semibold"
                  >
                    + Add Question
                  </button>
                </div>

                {newQuestions.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>Question #{idx + 1}</span>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => {
                          const updated = [...newQuestions];
                          updated[idx].marks = parseFloat(e.target.value) || 10;
                          setNewQuestions(updated);
                        }}
                        className="w-20 bg-white dark:bg-[#0c0d13] border border-slate-300 dark:border-white/[0.08] rounded-md px-2 py-1 text-right text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                        placeholder="Marks"
                      />
                    </div>
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => {
                        const updated = [...newQuestions];
                        updated[idx].question_text = e.target.value;
                        setNewQuestions(updated);
                      }}
                      placeholder="Enter question text..."
                      className="w-full bg-white dark:bg-[#0c0d13] border border-slate-300 dark:border-white/[0.08] focus:border-slate-500 dark:focus:border-white/30 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                    <textarea
                      value={q.sample_solution}
                      onChange={(e) => {
                        const updated = [...newQuestions];
                        updated[idx].sample_solution = e.target.value;
                        setNewQuestions(updated);
                      }}
                      placeholder="Enter model benchmark reference answer (for pgvector embedding)..."
                      rows={3}
                      className="w-full bg-white dark:bg-[#0c0d13] border border-slate-300 dark:border-white/[0.08] focus:border-slate-500 dark:focus:border-white/30 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-press px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTest}
                  className="btn-press bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 px-4 py-2 rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submittingTest ? 'Creating...' : 'Save Test and Model Keys'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
