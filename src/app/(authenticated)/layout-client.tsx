"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Settings, BookOpen, LogOut, Menu, X } from 'lucide-react';

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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA] font-sans antialiased text-zinc-900">
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-zinc-200/80 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900">Flip Classroom</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs flex flex-col pt-[57px] animate-in fade-in duration-150">
          <div className="bg-white p-5 shadow-xl flex-1 flex flex-col justify-between border-b border-zinc-200">
            <nav className="space-y-1.5">
              <Link 
                href="/admin/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <div className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 text-sm font-medium ${
                  isDashboardActive 
                    ? 'bg-zinc-100 text-zinc-900 font-semibold' 
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}>
                  <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                  Dashboard
                </div>
              </Link>
              <div 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  isSettingsActive 
                    ? 'bg-zinc-100 text-zinc-900 font-semibold' 
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                Settings
              </div>
            </nav>

            <div className="space-y-3 pt-5 border-t border-zinc-100">
              <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-semibold text-zinc-900 truncate">
                    {currentUser?.name || "User"}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
                    {currentUser?.role || "GUEST"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }} 
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Minimal Sidebar */}
      <aside className="w-60 bg-white flex flex-col min-h-screen border-r border-zinc-200/80 relative z-30 hidden md:flex shrink-0">
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-none">Flip Classroom</h1>
              <span className="text-[10px] text-zinc-400 font-medium">Evaluation Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/admin/dashboard" className="block">
            <div className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 text-xs font-medium ${
              isDashboardActive 
                ? 'bg-zinc-100 text-zinc-900 font-semibold' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}>
              <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
              Dashboard
            </div>
          </Link>
          <div className={`px-3 py-2 rounded-xl transition-all group cursor-pointer flex items-center gap-2.5 text-xs font-medium ${
            isSettingsActive 
              ? 'bg-zinc-100 text-zinc-900 font-semibold' 
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
          }`}>
            <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            Settings
          </div>
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-zinc-100 space-y-2">
          <div className="flex items-center gap-2.5 bg-zinc-50/80 rounded-xl p-2.5 border border-zinc-100">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-xs font-medium text-zinc-900 truncate">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
                {currentUser?.role || "GUEST"}
              </span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50/60 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#FAFAFA]">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
