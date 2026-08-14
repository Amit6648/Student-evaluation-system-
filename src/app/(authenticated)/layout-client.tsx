"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Settings, Lightbulb, LogOut, Menu, X } from 'lucide-react';

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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F7F6] font-sans antialiased text-slate-800">
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">Flip Classroom</span>
            <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">Evaluation Portal</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col pt-[65px] animate-in fade-in duration-150">
          <div className="bg-white p-6 shadow-2xl flex-1 flex flex-col justify-between border-b border-slate-200">
            <nav className="space-y-3">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 text-base ${
                  isDashboardActive 
                    ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 font-bold'
                }`}>
                  <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3.5 cursor-pointer text-base ${
                  isSettingsActive 
                    ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 font-bold'
                }`}
              >
                <Settings className="w-5 h-5 text-slate-400" />
                Settings
              </div>
            </nav>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3.5 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[11px] text-emerald-700 uppercase tracking-wider font-extrabold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition-colors border border-rose-100"
              >
                <LogOut className="w-4 h-4" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Spacious Light Sidebar */}
      <aside className="w-64 bg-white flex flex-col min-h-screen border-r border-slate-200/80 relative z-30 hidden md:flex shrink-0">
        {/* Brand Header */}
        <div className="p-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[16px] font-extrabold text-slate-900 tracking-tight leading-tight">Flip Classroom</h1>
              <span className="text-[11px] text-emerald-700 font-extrabold uppercase tracking-wider">Evaluation Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-2">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-4 py-3 rounded-2xl transition-all flex items-center gap-3.5 text-[15px] ${
              isDashboardActive 
                ? 'bg-emerald-50 text-emerald-950 font-extrabold border border-emerald-200/80 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-bold'
            }`}>
              <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-4 py-3 rounded-2xl transition-all group cursor-pointer flex items-center gap-3.5 text-[15px] ${
            isSettingsActive 
              ? 'bg-emerald-50 text-emerald-950 font-extrabold border border-emerald-200/80 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-bold'
          }`}>
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            Settings
          </div>
        </nav>

        {/* Footer User Info */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3.5 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[10px] text-emerald-700 uppercase tracking-widest font-extrabold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all border border-slate-200/60 hover:border-rose-200"
          >
            <LogOut className="w-4 h-4" /> Logout Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#F4F7F6]">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
