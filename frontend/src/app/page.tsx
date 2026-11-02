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
    </div>
  );
}
