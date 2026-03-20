import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import ClassroomDetail from './pages/ClassroomDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, Settings, Lightbulb, LifeBuoy } from 'lucide-react';

function App() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Fetch all users to populate the simulator
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                const nonStudents = data.filter(u => u.role !== 'STUDENT');
                setUsers(nonStudents);
                if (nonStudents.length > 0) {
                    setCurrentUser(nonStudents.find(u => u.role === 'ADMIN') || nonStudents[0]);
                }
            })
            .catch(err => console.error(err));
    }, []);

    if (!currentUser) return <div className="p-8 font-bold text-[#64748B] flex justify-center mt-20">Loading System...</div>;

    return (
        <div className="flex min-h-screen bg-[#F0F4F8] font-sans">
            {/* Deep Rich Navy Sidebar -> Refined Academic Sidebar */}
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
                    {/* Active Route Simulator (Mock) */}
                    <div className="px-4 py-3 rounded-r-xl rounded-l-sm bg-white/60 text-[#111827] font-bold border-l-[4px] border-[#0088FF] transition-all flex items-center gap-3 cursor-pointer shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-[#0088FF]" />
                        Dashboard
                    </div>
                    <div className="px-4 py-3 rounded-xl hover:bg-white/40 text-[#111827]/70 hover:text-[#111827] font-semibold transition-all group cursor-pointer flex items-center gap-3">
                        <Settings className="w-5 h-5 text-[#111827]/50 group-hover:text-[#111827] transition-colors" />
                        Settings
                    </div>
                    <div className="px-4 py-3 rounded-xl hover:bg-white/40 text-[#111827]/70 hover:text-[#111827] font-semibold transition-all group cursor-pointer flex items-center gap-3">
                        <LifeBuoy className="w-5 h-5 text-[#111827]/50 group-hover:text-[#111827] transition-colors" />
                        Support
                    </div>
                </nav>

                <div className="p-5 mt-auto border-t border-[#111827]/5">
                    <div className="flex items-center gap-3 bg-white/50 rounded-2xl p-3 border border-white/60 cursor-pointer hover:bg-white transition-colors group shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-[#5D685C] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm font-semibold text-[#111827] transition-colors truncate">
                                {currentUser?.name || "User"}
                            </span>
                            <span className="text-[10px] text-[#111827]/60 uppercase tracking-wider font-bold truncate">
                                {currentUser?.role || "GUEST"}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {/* Global Role Simulator Bar */}
                <div className="bg-[#F0F4F8]/90 px-6 py-4 flex justify-between items-center z-[100] sticky top-0 md:static backdrop-blur-xl border-b border-[#111827]/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[10px] text-[#111827]/60 uppercase tracking-wider bg-[#E8EEF4] px-2.5 py-1 rounded-md border border-[#111827]/10">Role Sim</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#111827]/70 hidden sm:block">Viewing as:</span>
                        <Select value={currentUser.id} onValueChange={(val) => setCurrentUser(users.find(u => u.id === val))}>
                            <SelectTrigger className="w-[240px] h-10 bg-white border border-[#111827]/10 text-[#111827] focus:ring-2 focus:ring-[#0088FF] focus:ring-offset-2 rounded-full text-sm font-bold shadow-sm transition-all">
                                <SelectValue placeholder="Select user..." />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] rounded-xl border-none shadow-xl">
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="cursor-pointer focus:bg-[#E8EEF4]">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#111827]">{u.name}</span>
                                            <span className="text-[10px] text-[#111827]/60 font-semibold">{u.role}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1">
                    <Routes>
                        <Route path="/" element={<Dashboard currentUser={currentUser} />} />
                        <Route path="/class/:id" element={<ClassroomDetail currentUser={currentUser} />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

export default App;
