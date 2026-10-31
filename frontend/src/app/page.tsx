'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { OverviewView } from '../components/OverviewView';
import { TeacherView } from '../components/TeacherView';
import { StudentView } from '../components/StudentView';
import { DBMSShowcaseView } from '../components/DBMSShowcaseView';
import { useRole } from '../context/RoleContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'teacher' | 'student' | 'showcase'>('overview');
  const { currentUser } = useRole();

  // If user switches role while on an opposite portal tab, automatically focus the relevant tab
  const displayedTab =
    activeTab === 'teacher' && currentUser.role === 'STUDENT'
      ? 'student'
      : activeTab === 'student' && currentUser.role === 'TEACHER'
      ? 'teacher'
      : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0c0d12] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar activeTab={displayedTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {displayedTab === 'overview' && <OverviewView setActiveTab={setActiveTab} />}
        {displayedTab === 'teacher' && <TeacherView />}
        {displayedTab === 'student' && <StudentView />}
        {displayedTab === 'showcase' && <DBMSShowcaseView />}
      </main>

      <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0c0d12] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            DBMS Experiential Learning Level 3 Project • Dept of CSE, PES University
          </div>
          <div className="font-mono text-slate-600 dark:text-slate-400">
            PES2UG24CS058 (Ananya Ratnaparkhi) &amp; PES2UG24CS061 (Hemanth Andey)
          </div>
        </div>
      </footer>
    </div>
  );
}
