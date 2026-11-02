'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ViewInspection, ExplainResult, TriggerTestResult, AuditLog } from '../lib/types';
import { 
  Terminal, 
  Zap, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Play, 
  Code2,
  Table,
  Sliders
} from 'lucide-react';

export const DBMSShowcaseView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'views' | 'explain' | 'triggers' | 'schema'>('views');

  // Views Inspector State
  const [selectedView, setSelectedView] = useState<string>('v_similarity_evaluation');
  const [viewData, setViewData] = useState<ViewInspection | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  // Explain Analyze State
  const [explainData, setExplainData] = useState<ExplainResult | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  // Triggers Demo State
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>('ANS_061_Q101');
  const [newScoreInput, setNewScoreInput] = useState<number>(10.0);
  const [triggerResult, setTriggerResult] = useState<TriggerTestResult | null>(null);
  const [loadingTrigger, setLoadingTrigger] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const [viewRes, explainRes, logs] = await Promise.all([
          api.getViewData(selectedView),
          api.explainVectorSearch(),
          api.getAuditLogs(),
        ]);
        if (active) {
          setViewData(viewRes);
          setExplainData(explainRes);
          setAuditLogs(logs);
        }
      } catch (err) {
        console.error('Failed to load initial showcase data:', err);
      }
    };
    loadInitialData();
    return () => {
      active = false;
    };
  }, [selectedView]);

  const loadViewData = async (vName: string) => {
    try {
      setLoadingView(true);
      setSelectedView(vName);
      const data = await api.getViewData(vName);
      setViewData(data);
    } catch (err) {
      console.error('Failed to load view:', err);
    } finally {
      setLoadingView(false);
    }
  };

  const runExplainAnalyze = async () => {
    try {
      setLoadingExplain(true);
      const data = await api.explainVectorSearch();
      setExplainData(data);
    } catch (err) {
      console.error('Failed to run explain analyze:', err);
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleTestTrigger = async () => {
    try {
      setLoadingTrigger(true);
      const res = await api.testTriggerDemo(selectedAnswerId, newScoreInput);
      setTriggerResult(res);
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: unknown) {
      alert(`Trigger execution failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingTrigger(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 sm:p-6 transition-colors">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            DBMS Showcase and Verification Panel
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Inspect relational views, vector query plans, and database triggers.
          </p>
        </div>

        {/* Sub-Navigation */}
        <div className="flex items-center space-x-1 mt-6 border-b border-slate-200 dark:border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('views')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === 'views'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Live Relational Views</span>
          </button>

          <button
            onClick={() => setActiveSubTab('explain')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === 'explain'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>EXPLAIN ANALYZE (HNSW Vector Index)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('triggers')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === 'triggers'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Triggers &amp; Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schema')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === 'schema'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Schema &amp; Architecture</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: Live Relational Views */}
      {activeSubTab === 'views' && (
        <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 space-y-4 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Table className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Live View Query Explorer</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Live views from multi-table joins and embeddings.
              </p>
            </div>

            {/* View Selector Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              {[
                { id: 'v_similarity_evaluation', label: 'v_similarity_evaluation' },
                { id: 'v_plagiarism_matrix', label: 'v_plagiarism_matrix' },
                { id: 'v_student_submission_summary', label: 'v_student_submission_summary' },
                { id: 'v_test_details', label: 'v_test_details' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => loadViewData(v.id)}
                  className={`btn-press whitespace-nowrap px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
                    selectedView === v.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-medium shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-[#141722] dark:text-slate-400 dark:hover:text-slate-200 dark:border-white/[0.06]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
              <button
                onClick={() => loadViewData(selectedView)}
                className="btn-press shrink-0 h-[30px] w-[30px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#141722] dark:hover:bg-white/[0.06] dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] rounded-md transition-colors"
                title="Refresh View"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingView ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* View Details Banner */}
          <div className="bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono transition-colors">
            <span className="text-slate-700 dark:text-slate-300">
              Query: <strong className="text-slate-900 dark:text-white">SELECT * FROM {selectedView};</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Total Rows: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{viewData?.row_count ?? 0}</strong>
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[500px] border border-slate-200 dark:border-white/[0.08] rounded-lg contain-scroll">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
              <thead className="bg-slate-50 dark:bg-[#141722] sticky top-0 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider z-10">
                <tr>
                  {viewData?.columns.map((col) => (
                    <th key={col} className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/[0.06] font-mono">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] bg-white dark:bg-[#0c0d13]">
                {viewData?.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    {viewData.columns.map((col) => {
                      const val = row[col];
                      let displayVal = String(val ?? 'NULL');
                      if (typeof val === 'number') {
                        displayVal = val.toFixed ? val.toFixed(2) : String(val);
                      }
                      if (displayVal.length > 70) {
                        displayVal = displayVal.slice(0, 70) + '...';
                      }
                      return (
                        <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {col.includes('score') || col.includes('marks') ? (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 tabular-nums font-semibold">{displayVal}</span>
                          ) : col.includes('id') ? (
                            <span className="font-mono text-slate-500 dark:text-slate-400">{displayVal}</span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: EXPLAIN ANALYZE Vector Search */}
      {activeSubTab === 'explain' && (
        <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>EXPLAIN (ANALYZE, BUFFERS) HNSW Vector Execution Plan</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Execution plan for cosine distance vector search (&lt;=&gt;).
              </p>
            </div>
            <button
              onClick={runExplainAnalyze}
              disabled={loadingExplain}
              className="btn-press flex items-center ps-3.5 pe-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-medium py-2 rounded-lg text-xs shadow-sm disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loadingExplain ? 'Executing query...' : 'Run Query Plan in Postgres'}</span>
            </button>
          </div>

          {explainData && (
            <div className="space-y-4">
              {/* SQL Query Card */}
              <div className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] rounded-lg p-3.5 transition-colors">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">SQL Executed</span>
                </div>
                <pre className="text-xs font-mono text-slate-800 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {explainData.query}
                </pre>
              </div>

              {/* Execution Plan Terminal */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 contain-scroll shadow-inner">
                <div className="flex items-center space-x-2 text-slate-400 pb-2 mb-3 border-b border-slate-800 text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span>PostgreSQL Query Execution Engine Output:</span>
                </div>
                <div className="space-y-1 overflow-x-auto">
                  {explainData.execution_plan.map((line, idx) => (
                    <div
                      key={idx}
                      className={`${
                        line.includes('Index Scan') || line.includes('hnsw')
                          ? 'text-emerald-400 font-medium'
                          : line.includes('actual time')
                          ? 'text-amber-300/90'
                          : line.includes('Buffers')
                          ? 'text-sky-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Triggers & Audit Trail */}
      {activeSubTab === 'triggers' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 transition-colors">
            <div className="pb-4 border-b border-slate-200 dark:border-white/[0.06] mb-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Live PostgreSQL Trigger Playground</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Test score recalculation and audit triggers in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Trigger Interactive Form */}
              <div className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl space-y-4 transition-colors">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Simulate Answer Score Change</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Score updates recalculate submission totals and append audit records.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Target Answer:
                  </label>
                  <select
                    value={selectedAnswerId}
                    onChange={(e) => setSelectedAnswerId(e.target.value)}
                    className="w-full bg-white dark:bg-[#0c0d13] border border-slate-300 dark:border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 dark:focus:border-white/30 font-mono"
                  >
                    <option value="ANS_061_Q101">ANS_061_Q101 (Hemanth Andey - Q101)</option>
                    <option value="ANS_058_Q101">ANS_058_Q101 (Ananya Ratnaparkhi - Q101)</option>
                    <option value="ANS_115_Q101">ANS_115_Q101 (Vikram Patel - Q101)</option>
                    <option value="ANS_102_Q101">ANS_102_Q101 (Ananya Sharma - Q101)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>New Marks to Award:</span>
                    <span className="font-mono text-slate-900 dark:text-white tabular-nums">{newScoreInput} / 10.0</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={newScoreInput}
                    onChange={(e) => setNewScoreInput(parseFloat(e.target.value))}
                    className="w-full accent-slate-900 dark:accent-white"
                  />
                </div>

                <button
                  onClick={handleTestTrigger}
                  disabled={loadingTrigger}
                  className="btn-press w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-medium py-2 rounded-lg text-xs shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{loadingTrigger ? 'Executing trigger...' : 'Execute UPDATE & Fire Triggers'}</span>
                </button>

                {triggerResult && (
                  <div className="bg-emerald-50 dark:bg-[#0c0d13] border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 text-xs space-y-1.5 mt-3 transition-colors">
                    <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Trigger Fired Atomically</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      Answer Marks: <span className="font-mono line-through text-slate-400 dark:text-slate-500">{triggerResult.answer_marks.old}</span> → <strong className="font-mono text-emerald-700 dark:text-emerald-400">{triggerResult.answer_marks.new}</strong>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      Recalculated Submission Total: <span className="font-mono line-through text-slate-400 dark:text-slate-500">{triggerResult.submission_score.before_trigger}</span> → <strong className="font-mono text-emerald-700 dark:text-emerald-400">{triggerResult.submission_score.after_trigger}</strong>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] pt-1">
                      Audit Log #{triggerResult.audit_log_entry?.log_id} recorded by {triggerResult.audit_log_entry?.performed_by}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Audit Log Feed */}
              <div className="bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.06] mb-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>PostgreSQL AUDIT_LOG Table</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{auditLogs.length} Records</span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-72 pr-1 contain-scroll">
                    {auditLogs.map((log) => (
                      <div
                        key={log.log_id}
                        className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-white/[0.06] p-2.5 rounded-md text-xs space-y-0.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">
                            #{log.log_id} • {log.action_type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.log_time).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          Target: {log.entity_name} ({log.record_id})
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-2">
                          <span className="line-through text-slate-400 dark:text-slate-500">{log.old_val}</span>
                          <span>→</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{log.new_val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 4: Schema & Architecture */}
      {activeSubTab === 'schema' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 space-y-4 transition-colors">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Advanced Database Architecture</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] transition-colors">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">1. Dual Paradigm Database (SQL + Vector)</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  PostgreSQL 16 with pgvector. Stores 384-dimensional dense embeddings with HNSW cosine indexing.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] transition-colors">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">2. Strong &amp; Weak Entity Modeling</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <code className="text-slate-800 dark:text-slate-300 font-mono">SIMILARITY_RESULT</code> uses composite key <code className="text-slate-800 dark:text-slate-300 font-mono">(result_id, embedding_id)</code> referencing <code className="text-slate-800 dark:text-slate-300 font-mono">ANSWER_EMBEDDING</code>.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] transition-colors">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">3. Automated Integrity Triggers</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Triggers recalculate submission scores and record immutable audit logs on mark changes.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#141722] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06] transition-colors">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">4. Stored Procedures</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <code className="text-slate-800 dark:text-slate-300 font-mono">sp_evaluate_submission</code> evaluates all answers against benchmarks within a single transaction.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm rounded-xl p-5 space-y-4 transition-colors">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Project Details</span>
            </h3>
            <div className="bg-slate-50 dark:bg-[#141722] p-4 rounded-lg border border-slate-200 dark:border-white/[0.06] text-xs space-y-2.5 transition-colors">
              <div className="text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Project: </span>
                <span className="text-slate-900 dark:text-white font-medium">Automated Evaluation and Similarity Detection</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Course: </span>
                <span>DBMS Experiential Learning (Level 3)</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Instructor: </span>
                <span className="text-slate-900 dark:text-white font-medium">Dr. Deena Hajim</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
                <div className="text-slate-800 dark:text-slate-300 font-semibold">Team Members:</div>
                <div className="text-slate-700 dark:text-slate-300 font-mono">Hemanth Andey (PES2UG24CS061) • Ananya Ratnaparkhi (PES2UG24CS058)</div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
                <div className="text-slate-800 dark:text-slate-300 font-semibold">Stack:</div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed font-mono text-[11px]">
                  FastAPI (8000) • PostgreSQL 16 pgvector (5433) • Next.js (3000)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
