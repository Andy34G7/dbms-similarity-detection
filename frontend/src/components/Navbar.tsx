'use client';

import React, { useState } from 'react';
import { useRole, PRESET_USERS } from '../context/RoleContext';
import { useTheme } from '../context/ThemeContext';
import { 
  GraduationCap, 
  UserCheck, 
  Database, 
  BookOpen, 
  ChevronDown, 
  ShieldCheck, 
  Terminal,
  LayoutDashboard,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'teacher' | 'student' | 'showcase';
  setActiveTab: (tab: 'overview' | 'teacher' | 'student' | 'showcase') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, switchUserById } = useRole();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0c0d12]/95 backdrop-blur border-b border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('overview')}>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs">
              <Database className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white tracking-tight">
                  AutoEval DBMS
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <span>PES University</span>
                <span>•</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">PES2UG24CS058 &amp; 061</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`btn-press flex items-center ps-3 pe-3.5 gap-2 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-white/[0.12] dark:text-white dark:border dark:border-white/[0.16]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('teacher')}
              className={`btn-press flex items-center ps-3 pe-3.5 gap-2 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'teacher'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-white/[0.12] dark:text-white dark:border dark:border-white/[0.16]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teacher Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`btn-press flex items-center ps-3 pe-3.5 gap-2 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'student'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-white/[0.12] dark:text-white dark:border dark:border-white/[0.16]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('showcase')}
              className={`btn-press flex items-center ps-3 pe-3.5 gap-2 py-1.5 rounded-lg text-xs font-medium ${
                activeTab === 'showcase'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-white/[0.12] dark:text-white dark:border dark:border-white/[0.16]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>DBMS Showcase</span>
            </button>
          </nav>

          {/* Right Controls: Theme Toggle & Role Switcher */}
          <div className="flex items-center space-x-2">
            
            {/* Minimalist Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-press p-2 rounded-lg bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 shadow-xs"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle visual theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-300" />
              )}
            </button>

            {/* One-Click Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-press flex items-center space-x-2.5 bg-white dark:bg-white/[0.05] hover:bg-slate-50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.14] px-2.5 py-1.5 rounded-lg shadow-xs focus:outline-none"
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center font-medium text-[11px] ${
                    currentUser.role === 'TEACHER'
                      ? 'bg-sky-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium leading-none text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({currentUser.role.toLowerCase()})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{currentUser.deptOrSRN}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="contain-scroll absolute right-0 mt-2 w-72 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-xl p-1.5 z-50">
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">Switch Persona</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Test evaluator or student role permissions.
                    </div>
                  </div>

                  <div className="space-y-0.5 max-h-80 overflow-y-auto contain-scroll">
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold px-2.5 pt-1.5 pb-0.5 uppercase tracking-wider">
                      Teachers &amp; Evaluators
                    </div>
                    {PRESET_USERS.filter((u) => u.role === 'TEACHER').map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUserById(user.id);
                          setDropdownOpen(false);
                        }}
                        className={`btn-press w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentUser.id === user.id
                            ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-semibold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-200">{user.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        )}
                      </button>
                    ))}

                    <div className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold px-2.5 pt-2 pb-0.5 uppercase tracking-wider">
                      Students
                    </div>
                    {PRESET_USERS.filter((u) => u.role === 'STUDENT').map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUserById(user.id);
                          setDropdownOpen(false);
                        }}
                        className={`btn-press w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentUser.id === user.id
                            ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-semibold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-medium text-slate-900 dark:text-slate-200">{user.name}</span>
                              {(user.id === 'PES2UG24CS058' || user.id === 'PES2UG24CS061') && (
                                <span className="text-[9px] bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 px-1 rounded font-mono">
                                  Team
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{user.deptOrSRN}</div>
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
