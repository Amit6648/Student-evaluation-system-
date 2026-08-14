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
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-[#11221F]">Flip Classroom</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col pt-[57px] animate-in fade-in duration-150">
          <div className="bg-white p-5 shadow-2xl flex-1 flex flex-col justify-between border-b border-slate-200">
            <nav className="space-y-2">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-4 py-3 rounded-2xl transition-all flex items-center gap-3 text-sm ${
                  isDashboardActive 
                    ? 'bg-emerald-50 text-emerald-900 font-bold border-l-[3px] border-emerald-600 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 font-semibold'
                }`}>
                  <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-2xl transition-all flex items-center gap-3 cursor-pointer text-sm ${
                  isSettingsActive 
                    ? 'bg-emerald-50 text-emerald-900 font-bold border-l-[3px] border-emerald-600 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </div>
            </nav>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-bold text-[#11221F] truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-extrabold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Clean Light Sidebar */}
      <aside className="w-60 bg-white flex flex-col min-h-screen border-r border-slate-200/80 relative z-30 hidden md:flex shrink-0">
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[#11221F] tracking-tight leading-none">Flip Classroom</h1>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Evaluation Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-xs ${
              isDashboardActive 
                ? 'bg-emerald-50 text-emerald-900 font-bold border-l-[3px] border-emerald-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'
            }`}>
              <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-3.5 py-2.5 rounded-xl transition-all group cursor-pointer flex items-center gap-2.5 text-xs ${
            isSettingsActive 
              ? 'bg-emerald-50 text-emerald-900 font-bold border-l-[3px] border-emerald-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'
          }`}>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            Settings
          </div>
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2.5 bg-slate-50/80 rounded-2xl p-2.5 border border-slate-100 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-xs font-bold text-[#11221F] truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[9px] text-emerald-700 uppercase tracking-wider font-extrabold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout Session
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
