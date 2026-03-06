import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, X, GraduationCap, Users, ChevronRight } from "lucide-react";

export default function Dashboard() {
    const [classrooms, setClassrooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        fetch('/api/classrooms')
            .then(res => res.json())
            .then(data => {
                setClassrooms(data);
                setDataLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch classrooms", err);
                setDataLoading(false);
            });
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        try {
            const res = await fetch('/api/classrooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dept_info: formData.get("dept"),
                    class_name: formData.get("name"),
                    semester: formData.get("semester"),
                })
            });
            const newClass = await res.json();

            // Reload classrooms after creation
            const updatedRes = await fetch('/api/classrooms');
            const updatedData = await updatedRes.json();
            setClassrooms(updatedData);

            setShowModal(false);
            e.target.reset();
        } catch (err) {
            console.error("Failed to create classroom", err);
        } finally {
            setLoading(false);
        }
    }

    if (dataLoading) {
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-gray-500">Loading Classrooms...</div>;
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto">
            <div className="relative z-0">
                {/* Ambient Background Gradient */}
                <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-pink-50/50 opacity-60 pointer-events-none"></div>

                <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#111827] flex items-center gap-3">
                            <GraduationCap className="w-10 h-10 text-[#E8B4B8]" />
                            Flip Classroom
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage your smart flipped classrooms</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-[#111827] text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95 group shrink-0"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> New Class
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Create New Class Card */}
                    <div
                        onClick={() => setShowModal(true)}
                        className="bg-transparent border-2 border-dashed border-gray-200 rounded-[24px] p-8 flex flex-col items-center justify-center text-center transition-all hover:border-[#E8B4B8] hover:bg-white/50 aspect-square group cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-gray-400 group-hover:text-[#E8B4B8] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <Plus size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-[#111827]">New Class</h3>
                        <p className="text-gray-500 mt-2 text-sm font-medium px-4">Create a new environment</p>
                    </div>
                    {classrooms.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white/40 rounded-[24px] border border-black/5">
                            <p className="text-gray-500 mb-4">No classrooms created yet</p>
                            <button onClick={() => setShowModal(true)} className="text-[#E8B4B8] font-semibold hover:underline">
                                Create your first class
                            </button>
                        </div>
                    ) : (
                        classrooms.map((c) => (
                            <Link
                                to={`/class/${c.class_id}`}
                                key={c.class_id}
                                className="group relative bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-8 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#111827]/5 flex flex-col justify-between aspect-square overflow-hidden"
                            >
                                {/* Subtle hover gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#E8B4B8]/0 to-[#E8B4B8]/0 group-hover:to-[#E8B4B8]/10 transition-colors duration-500 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#E8B4B8] inline-block bg-[#E8B4B8]/10 px-3 py-1.5 rounded-full">
                                            {c.dept_info}
                                        </span>
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shadow-sm text-xs font-bold text-gray-500">
                                            <Users size={14} className="text-[#E8B4B8]" />
                                            {c.student_count || 0}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-[#111827] leading-tight mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#111827] group-hover:to-gray-600 transition-all duration-300">
                                        {c.class_name}
                                    </h2>
                                    {c.semester && (
                                        <p className="text-gray-500 font-medium text-sm flex items-center gap-1.5 opacity-80 mt-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block"></span> {c.semester}
                                        </p>
                                    )}
                                </div>

                                <div className="relative z-10 flex items-center justify-between text-[#E8B4B8] font-bold mt-8">
                                    <span className="text-sm tracking-wide group-hover:translate-x-1 transition-transform">Enter Classroom</span>
                                    <div className="w-10 h-10 rounded-full bg-white border border-[#E8B4B8]/20 flex items-center justify-center group-hover:bg-[#E8B4B8] group-hover:text-white transition-all shadow-sm">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-[#111827]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-[#111827]">Create Classroom</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                                    <input required name="dept" type="text" placeholder="e.g. Computer Science" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subject Name</label>
                                    <input required name="name" type="text" placeholder="e.g. Data Structures" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Semester (Optional)</label>
                                    <input name="semester" type="text" placeholder="e.g. Fall 2026" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all" />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 mt-8">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loading} className="bg-[#111827] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                                        {loading ? 'Creating...' : 'Create Class'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
