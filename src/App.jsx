import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import ClassroomDetail from './pages/ClassroomDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

    if (!currentUser) return <div className="p-8 font-bold text-gray-500 flex justify-center mt-20">Loading System...</div>;

    return (
        <div>
            {/* Global Role Simulator Bar */}
            <div className="bg-[#111827] text-white p-3 flex justify-between items-center shadow-md relative z-[100]">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-[#E8B4B8] uppercase tracking-wider bg-white/10 px-2 py-1 rounded-md">Role Simulator Active</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-300">Viewing as:</span>
                    <Select value={currentUser.id} onValueChange={(val) => setCurrentUser(users.find(u => u.id === val))}>
                        <SelectTrigger className="w-[240px] h-9 bg-white/10 border-white/20 text-white focus:ring-0 rounded-lg">
                            <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                            {users.map(u => (
                                <SelectItem key={u.id} value={u.id} className="cursor-pointer">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{u.name}</span>
                                        <span className="text-xs text-gray-400">{u.role}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Routes>
                <Route path="/" element={<Dashboard currentUser={currentUser} />} />
                <Route path="/class/:id" element={<ClassroomDetail currentUser={currentUser} />} />
            </Routes>
        </div>
    );
}

export default App;
