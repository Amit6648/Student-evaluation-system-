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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F0F4F8] font-sans">
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[#5D685C] text-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Lightbulb className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-tight">Flip Classroom</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col pt-[65px] animate-in fade-in duration-200">
          <div className="bg-[#E8EEF4] p-6 shadow-2xl flex-1 flex flex-col justify-between border-b border-[#111827]/10">
            <nav className="space-y-3">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3 shadow-sm ${
                  isDashboardActive 
                    ? 'bg-white text-[#111827] font-bold border-l-[4px] border-[#0088FF]' 
                    : 'bg-white/50 text-[#111827]/70 font-semibold'
                }`}>
                  <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-[#0088FF]' : 'text-[#111827]/50'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-5 py-3.5 rounded-2xl transition-all flex items-center gap-3 cursor-pointer shadow-sm ${
                  isSettingsActive 
                    ? 'bg-white text-[#111827] font-bold border-l-[4px] border-[#0088FF]' 
                    : 'bg-white/50 text-[#111827]/70 font-semibold'
                }`}
              >
                <Settings className="w-5 h-5 text-[#111827]/50" />
                Settings
              </div>
            </nav>

            <div className="space-y-4 pt-6 border-t border-[#111827]/10">
              <div className="flex items-center gap-3 bg-white/70 rounded-2xl p-3.5 border border-white shadow-sm">
                <div className="w-11 h-11 rounded-full bg-[#5D685C] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-bold text-[#111827] truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[10px] text-[#111827]/60 uppercase tracking-wider font-extrabold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#E8EEF4] flex flex-col min-h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative z-30 hidden md:flex border-r border-[#111827]/5 shrink-0">
        <div className="w-full bg-[#5D685C] shadow-sm">
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              <Lightbulb className="text-white w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none mt-0.5">Flip Classroom</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-4 py-3 rounded-r-xl rounded-l-sm transition-all flex items-center gap-3 cursor-pointer shadow-sm ${
              isDashboardActive 
                ? 'bg-white/60 text-[#111827] font-bold border-l-[4px] border-[#0088FF]' 
                : 'hover:bg-white/40 text-[#111827]/70 hover:text-[#111827] font-semibold'
            }`}>
              <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-[#0088FF]' : 'text-[#111827]/50'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-4 py-3 rounded-xl transition-all group cursor-pointer flex items-center gap-3 ${
            isSettingsActive 
              ? 'bg-white/60 text-[#111827] font-bold border-l-[4px] border-[#0088FF]' 
              : 'hover:bg-white/40 text-[#111827]/70 hover:text-[#111827] font-semibold'
          }`}>
            <Settings className="w-5 h-5 text-[#111827]/50 group-hover:text-[#111827] transition-colors" />
            Settings
          </div>
        </nav>

        <div className="p-5 mt-auto border-t border-[#111827]/5 space-y-4">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-white/60 text-red-500 font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Logout Session
          </button>
          
          <div className="flex items-center gap-3 bg-white/50 rounded-2xl p-3 border border-white/60 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#5D685C] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-sm font-semibold text-[#111827] truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[10px] text-[#111827]/60 uppercase tracking-wider font-bold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
