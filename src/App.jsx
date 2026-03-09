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
        <div className="flex min-h-screen bg-[#F8F9FA] font-sans">
            {/* Deep Rich Navy Sidebar */}
            <aside className="w-64 bg-zinc-200 flex flex-col min-h-screen shadow-inner relative z-40 hidden md:flex border-r border-zinc-300">
                <div className="w-full bg-zinc-800 border-b border-zinc-700 shadow-sm">
                    <div className="flex items-center gap-3 px-5 py-4">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                            <Lightbulb className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-lg font-extrabold text-white tracking-tight leading-none mt-0.5">Flip Classroom</h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-2">
                    {/* Active Route Simulator (Mock) */}
                    <div className="px-4 py-3 rounded-xl bg-zinc-300 text-zinc-900 font-bold border border-zinc-400 transition-all flex items-center gap-3 cursor-pointer shadow-sm">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </div>
                    <div className="px-4 py-3 rounded-xl hover:bg-zinc-300/60 text-zinc-600 hover:text-zinc-900 font-semibold transition-all group cursor-pointer flex items-center gap-3">
                        <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
                        Settings
                    </div>
                    <div className="px-4 py-3 rounded-xl hover:bg-zinc-300/60 text-zinc-600 hover:text-zinc-900 font-semibold transition-all group cursor-pointer flex items-center gap-3">
                        <LifeBuoy className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
                        Support
                    </div>
                </nav>

                <div className="p-5 mt-auto border-t border-zinc-300">
                    <div className="flex items-center gap-3 bg-zinc-100 rounded-2xl p-3 border border-zinc-300 cursor-pointer hover:bg-white transition-colors group shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm font-semibold text-zinc-900 transition-colors truncate">
                                {currentUser?.name || "User"}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold truncate">
                                {currentUser?.role || "GUEST"}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {/* Global Role Simulator Bar (Float top right or Sticky) */}
                <div className="bg-white/80 text-zinc-900 px-6 py-3 flex justify-between items-center shadow-sm z-[100] sticky top-0 md:static backdrop-blur-xl border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-wider bg-zinc-100 px-2 py-1 rounded-md">Role Sim</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-500 hidden sm:block">Viewing as:</span>
                        <Select value={currentUser.id} onValueChange={(val) => setCurrentUser(users.find(u => u.id === val))}>
                            <SelectTrigger className="w-[200px] h-9 bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-0 rounded-lg text-sm font-medium">
                                <SelectValue placeholder="Select user..." />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="cursor-pointer">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{u.name}</span>
                                            <span className="text-[10px] text-[#64748B]/80 font-semibold">{u.role}</span>
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
