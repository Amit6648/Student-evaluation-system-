import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import ClassroomDetail from './pages/ClassroomDetail';
import Login from './pages/Login';
import { LayoutDashboard, Settings, Lightbulb, LifeBuoy, LogOut, ShieldAlert } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center gap-4">
                <ShieldAlert className="w-12 h-12 text-[#0088FF] animate-pulse" />
                <div className="font-bold text-[#111827]/50 uppercase tracking-widest text-sm">Verifying Authority...</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

function AppLayout() {
    const { user, logout } = useAuth();
    
    return (
        <div className="flex min-h-screen bg-[#F0F4F8] font-sans">
            <aside className="w-64 bg-[#E8EEF4] flex flex-col min-h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative z-40 hidden md:flex border-r border-[#111827]/5">
                <div className="w-full bg-[#5D685C] shadow-sm">
                    <div className="flex items-center gap-3 px-6 py-5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                            <Lightbulb className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none mt-0.5">Flip Classroom</h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <div className="px-4 py-3 rounded-r-xl rounded-l-sm bg-white/60 text-[#111827] font-bold border-l-[4px] border-[#0088FF] transition-all flex items-center gap-3 cursor-pointer shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-[#0088FF]" />
                        Dashboard
                    </div>
                    <div className="px-4 py-3 rounded-xl hover:bg-white/40 text-[#111827]/70 hover:text-[#111827] font-semibold transition-all group cursor-pointer flex items-center gap-3">
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
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm font-semibold text-[#111827] truncate">
                                {user?.name || "User"}
                            </span>
                            <span className="text-[10px] text-[#111827]/60 uppercase tracking-wider font-bold truncate">
                                {user?.role || "GUEST"}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                <div className="bg-[#F0F4F8]/90 px-6 py-4 flex justify-between items-center z-[100] sticky top-0 md:static backdrop-blur-xl border-b border-[#111827]/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-500/20 uppercase tracking-wider">Secure Access</span>
                    </div>
                </div>
                <div className="flex-1">
                    <Routes>
                        <Route path="/" element={<Dashboard currentUser={user} />} />
                        <Route path="/admin/dashboard" element={<Dashboard currentUser={user} />} />
                        <Route path="/class/:id" element={<ClassroomDetail currentUser={user} />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                } />
            </Routes>
        </AuthProvider>
    );
}

export default App;
