'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SystemStats } from '../lib/types';
import { useRole } from '../context/RoleContext';
import { 
  GraduationCap, 
  BookOpen, 
  Terminal, 
  ArrowRight
} from 'lucide-react';

interface OverviewViewProps {
  setActiveTab: (tab: 'overview' | 'teacher' | 'student' | 'showcase') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ setActiveTab }) => {
  const { currentUser } = useRole();
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1118] border border-slate-200/90 dark:border-white/[0.08] shadow-sm p-7 sm:p-9 transition-colors">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Automated Test Evaluation and Vector Similarity System
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Evaluates test answers and detects collusion using PostgreSQL 16 and pgvector embeddings.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab(currentUser.role === 'TEACHER' ? 'teacher' : 'student')}
              className="btn-press flex items-center ps-4 pe-3.5 gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-medium py-2.5 rounded-lg text-xs shadow-sm transition-colors"
            >
              <span>Open {currentUser.role === 'TEACHER' ? 'Teacher Portal' : 'Student Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('showcase')}
              className="btn-press flex items-center ps-3.5 pe-4 gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-200 dark:border-white/[0.08] dark:hover:border-white/[0.15] font-medium py-2.5 rounded-lg text-xs transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>DBMS Showcase</span>
            </button>
          </div>
        </div>

        {/* System Telemetry Metrics */}
        {stats && (
          <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-7 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="bg-slate-50 dark:bg-[#141722] p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] transition-colors">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active tests</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-1">{stats.test_count}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.question_count} questions configured</div>
            </div>

            <div className="bg-slate-50 dark:bg-[#141722] p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] transition-colors">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Submissions</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-1">{stats.submission_count}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.student_answers_count} student answers</div>
            </div>

            <div className="bg-slate-50 dark:bg-[#141722] p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] transition-colors">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Dense embeddings</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-1">{stats.embedding_count}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">vector(384) in pgvector</div>
            </div>

            <div className="bg-slate-50 dark:bg-[#141722] p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] transition-colors">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Plagiarism pairs</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-1">{stats.peer_plagiarism_count}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">N × N cross-evaluated</div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => setActiveTab('teacher')}
          className="btn-press group cursor-pointer bg-white hover:bg-slate-50/80 dark:bg-[#0f1118] dark:hover:bg-[#141722] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-colors"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-white/[0.06] border border-sky-100 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Teacher and Evaluator Portal
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Create tests, run batch evaluations, and inspect pairwise collusion.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <span>Explore teacher tools</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('student')}
          className="btn-press group cursor-pointer bg-white hover:bg-slate-50/80 dark:bg-[#0f1118] dark:hover:bg-[#141722] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-colors"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-white/[0.06] border border-emerald-100 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Student Assessment Workspace
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Submit test answers and view score breakdowns.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <span>Start test attempt</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('showcase')}
          className="btn-press group cursor-pointer bg-white hover:bg-slate-50/80 dark:bg-[#0f1118] dark:hover:bg-[#141722] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-colors"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-white/[0.06] border border-amber-100 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <Terminal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              DBMS Showcase and Viva Hub
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect SQL views, HNSW index execution plans, and triggers.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <span>Open viva showcase</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
