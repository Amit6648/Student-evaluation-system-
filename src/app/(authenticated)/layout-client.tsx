"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Settings, Lightbulb, LogOut, Menu, X, Sparkles } from 'lucide-react';

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
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[#11221F] text-white sticky top-0 z-50 shadow-md border-b border-emerald-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Lightbulb className="text-emerald-400 w-5 h-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">Flip Classroom</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col pt-[65px] animate-in fade-in duration-200">
          <div className="bg-[#11221F] text-white p-6 shadow-2xl flex-1 flex flex-col justify-between border-b border-emerald-900/30">
            <nav className="space-y-3">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3 shadow-xs ${
                  isDashboardActive 
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border-l-[4px] border-emerald-400' 
                    : 'text-slate-300 hover:bg-white/5 font-semibold'
                }`}>
                  <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3 cursor-pointer ${
                  isSettingsActive 
                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border-l-[4px] border-emerald-400' 
                    : 'text-slate-300 hover:bg-white/5 font-semibold'
                }`}
              >
                <Settings className="w-5 h-5 text-slate-400" />
                Settings
              </div>
            </nav>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3.5 border border-white/10 shadow-xs">
                <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-bold text-white truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold transition-colors shadow-xs"
              >
                <LogOut className="w-4 h-4" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#11221F] text-white flex flex-col min-h-screen shadow-xl relative z-30 hidden md:flex border-r border-emerald-950/40 shrink-0">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 px-2 py-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Lightbulb className="text-emerald-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">Flip Classroom</h1>
              <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">Evaluation System</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-4 py-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
              isDashboardActive 
                ? 'bg-emerald-500/15 text-emerald-300 font-bold border-l-[3px] border-emerald-400 shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
            }`}>
              <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-4 py-3 rounded-xl transition-all group cursor-pointer flex items-center gap-3 ${
            isSettingsActive 
              ? 'bg-emerald-500/15 text-emerald-300 font-bold border-l-[3px] border-emerald-400 shadow-xs' 
              : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
          }`}>
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-200 transition-colors" />
            Settings
          </div>
        </nav>

        <div className="p-5 mt-auto border-t border-white/10 space-y-4">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Logout Session
          </button>
          
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/10 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-sm font-semibold text-white truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>
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
