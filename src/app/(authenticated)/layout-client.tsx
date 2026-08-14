"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Settings, Lightbulb, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthenticatedLayoutClient({
  currentUser,
  children,
}: {
  currentUser: {
    id: string;
    role: string;
    name: string;
    roll_no: string | null;
    course_id: string | null;
  };
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dashboard active state: includes root, dashboard, and classroom details page
  const isDashboardActive = pathname === '/admin/dashboard' || pathname === '/' || pathname.startsWith('/class/');
  const isSettingsActive = pathname === '/settings';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F7F6] dark:bg-[#080D0C] font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-150 relative">
      {/* Fixed Top-Right Theme Toggle (Desktop & Tablet) */}
      <div className="fixed top-5 right-6 sm:right-8 z-50 hidden md:block">
        <ThemeToggle />
      </div>

      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white dark:bg-[#0E1513] border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">Flip Classroom</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">Evaluation Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col pt-[65px] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1513] p-6 shadow-2xl flex-1 flex flex-col justify-between border-b border-slate-200 dark:border-white/10">
            <nav className="space-y-3">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 text-base ${
                  isDashboardActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-700/50 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-bold'
                }`}>
                  <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 cursor-pointer text-base ${
                  isSettingsActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-700/50 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <Settings className="w-5 h-5 text-slate-400" />
                Settings
              </div>
            </nav>

            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-extrabold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 text-sm font-bold transition-colors border border-rose-100 dark:border-rose-900/40"
              >
                <LogOut className="w-4 h-4" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Spacious Sidebar with Dark Mode */}
      <aside className="w-64 bg-white dark:bg-[#0E1513] flex flex-col min-h-screen border-r border-slate-200/80 dark:border-white/10 relative z-30 hidden md:flex shrink-0 transition-colors duration-150">
        {/* Brand Header */}
        <div className="p-6 pb-5 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[16px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">Flip Classroom</h1>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Evaluation Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-2">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-4 py-3 rounded-2xl transition-all flex items-center gap-3.5 text-[15px] ${
              isDashboardActive 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-extrabold border border-emerald-200/80 dark:border-emerald-700/50 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 font-bold'
            }`}>
              <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-4 py-3 rounded-2xl transition-all group cursor-pointer flex items-center gap-3.5 text-[15px] ${
            isSettingsActive 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-extrabold border border-emerald-200/80 dark:border-emerald-700/50 shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 font-bold'
          }`}>
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            Settings
          </div>
        </nav>

        {/* Footer User Info */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 space-y-3">
          <div className="flex items-center gap-3.5 bg-slate-50/90 dark:bg-white/5 rounded-2xl p-3.5 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-extrabold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all border border-slate-200/60 dark:border-white/10 hover:border-rose-200 dark:hover:border-rose-900/50"
          >
            <LogOut className="w-4 h-4" /> Logout Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#F4F7F6] dark:bg-[#080D0C] transition-colors duration-150">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
