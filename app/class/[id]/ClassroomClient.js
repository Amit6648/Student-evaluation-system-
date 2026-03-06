"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Users, BookOpen, Trash2, CheckCircle2, X, BarChart } from "lucide-react";
import { enrollStudent, addEvaluation, removeStudent } from "@/app/actions";

// Helper to generate initials
function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

// Helper to get a consistent color based on name string
function getAvatarColor(name) {
    const colors = [
        "bg-blue-100 text-blue-700",
        "bg-emerald-100 text-emerald-700",
        "bg-amber-100 text-amber-700",
        "bg-indigo-100 text-indigo-700",
        "bg-pink-100 text-pink-700",
        "bg-purple-100 text-purple-700",
        "bg-rose-100 text-rose-700",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function ClassroomClient({ classroom, students, allStudents, stats }) {
    const [activeTab, setActiveTab] = useState("roster");
    const [showModal, setShowModal] = useState(false);
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [evalStudent, setEvalStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savedMarks, setSavedMarks] = useState({});

    // Filters for enrollment
    const [filterDept, setFilterDept] = useState("");
    const [filterSem, setFilterSem] = useState("");
    const [filterSec, setFilterSec] = useState("");

    const enrolledIds = new Set(students.map(s => s.student_id));
    const availableStudents = (allStudents || []).filter(s => {
        if (enrolledIds.has(s.student_id)) return false;
        if (filterDept && s.department !== filterDept) return false;
        if (filterSem && s.semester !== filterSem) return false;
        if (filterSec && s.section !== filterSec) return false;
        return true;
    });

    // Extract unique filter options
    const departments = [...new Set((allStudents || []).map(s => s.department).filter(Boolean))];
    const semesters = [...new Set((allStudents || []).map(s => s.semester).filter(Boolean))];
    const sections = [...new Set((allStudents || []).map(s => s.section).filter(Boolean))];

    async function handleEnroll(studentId) {
        setLoading(true);
        const formData = new FormData();
        formData.append("student_id", studentId);
        await enrollStudent(classroom.class_id, formData);
        setLoading(false);
        // setShowModal(false); // keeping it open to enroll multiple
    }

    const [evalHistoryStudent, setEvalHistoryStudent] = useState(null);

    async function handleAddEval(e) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        const evalName = formData.get("eval_name");
        const fundamental = formData.get("fundamental_knowledge");
        const core = formData.get("core_skills");
        const communication = formData.get("communication_skills");
        const soft = formData.get("soft_skills");

        await addEvaluation(evalStudent.enrollment_id, evalName, fundamental, core, communication, soft);
        setLoading(false);
        setShowEvalModal(false);
        setEvalStudent(null);
    }

    async function handleRemove(enrollmentId) {
        if (confirm("Remove student? Marks will be lost.")) {
            await removeStudent(enrollmentId);
        }
    }

    return (
        <>
            <Link href="/" className="inline-flex items-center text-gray-500 hover:text-[#111827] mb-8 font-semibold transition-colors">
                <ChevronLeft size={20} className="mr-1" /> Back to Classrooms
            </Link>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <span className="text-sm font-bold uppercase tracking-wider text-[#E8B4B8] mb-2 inline-block">
                        {classroom.dept_info} {classroom.semester && `• ${classroom.semester}`}
                    </span>
                    <h1 className="text-4xl font-extrabold text-[#111827]">{classroom.class_name}</h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#111827] text-white px-5 py-2.5 rounded-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-sm active:scale-95 whitespace-nowrap group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> Enroll Student
                </button>
            </header>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Enrolled</p>
                        <p className="text-3xl font-black text-[#111827]">{stats?.totalStudents || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Class Average</p>
                        <p className="text-3xl font-black text-[#111827]">{stats?.classAvg || '--'}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <BarChart size={24} />
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Top Score</p>
                        <p className="text-3xl font-black text-[#111827]">{stats?.topScore || '--'}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div >

            <div className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] shadow-sm overflow-hidden flex flex-col mb-12">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 pt-4">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`px-6 py-4 font-semibold text-[15px] flex items-center gap-2 border-b-2 transition-all ${activeTab === 'roster' ? 'border-[#E8B4B8] text-[#111827]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Users size={18} className={activeTab === 'roster' ? 'text-[#E8B4B8]' : ''} />
                        Student Roster
                    </button>
                    <button
                        onClick={() => setActiveTab('gradebook')}
                        className={`px-6 py-4 font-semibold text-[15px] flex items-center gap-2 border-b-2 transition-all ${activeTab === 'gradebook' ? 'border-[#E8B4B8] text-[#111827]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <BookOpen size={18} className={activeTab === 'gradebook' ? 'text-[#E8B4B8]' : ''} />
                        Gradebook
                    </button>
                    <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`px-6 py-4 font-semibold text-[15px] flex items-center gap-2 border-b-2 transition-all ${activeTab === 'heatmap' ? 'border-[#E8B4B8] text-[#111827]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <BarChart size={18} className={activeTab === 'heatmap' ? 'text-[#E8B4B8]' : ''} />
                        Performance Heatmap
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 flex-1 flex flex-col">
                    {students.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users size={24} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium mb-4">No students enrolled in this class yet.</p>
                            <button onClick={() => setShowModal(true)} className="text-[#E8B4B8] font-semibold hover:underline">
                                Add the first student
                            </button>
                        </div>
                    ) : activeTab === 'heatmap' ? (
                        <div className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {students.map((s) => {
                                    let colorClass = "bg-gray-100 text-gray-500 border-gray-200"; // No Marks

                                    if (s.averageMarks !== null && s.averageMarks !== undefined) {
                                        if (s.averageMarks >= 32) colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                        else if (s.averageMarks >= 24) colorClass = "bg-amber-100 text-amber-800 border-amber-200";
                                        else if (s.averageMarks >= 16) colorClass = "bg-orange-100 text-orange-800 border-orange-200";
                                        else colorClass = "bg-red-100 text-red-800 border-red-200";
                                    }

                                    return (
                                        <div
                                            key={s.student_id}
                                            onClick={() => setEvalHistoryStudent(s)}
                                            className={`p-5 rounded-[24px] border ${colorClass} flex flex-col justify-between aspect-square transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 shadow-sm hover:shadow-lg cursor-pointer`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(s.name)}`}>
                                                    {getInitials(s.name)}
                                                </div>
                                                <span className="text-xs font-bold opacity-70 bg-white/50 px-2 py-1 rounded-md backdrop-blur-sm">{s.roll_no}</span>
                                            </div>
                                            <div className="mt-4">
                                                <h3 className="font-bold leading-tight line-clamp-2 text-[#111827]">{s.name}</h3>
                                            </div>
                                            <div className="text-4xl font-black mt-2 self-end flex flex-col items-end text-[#111827]">
                                                {s.averageMarks !== null ? s.averageMarks : '--'}
                                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-50 mt-1">Avg Score</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 flex gap-6 text-sm font-semibold text-gray-500 items-center justify-center bg-gray-50 py-3 rounded-xl">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div> &ge; 32 (High)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-100 border border-amber-200"></div> 24 - 31 (Average)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div> 16 - 23 (Low)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div> &lt; 16 (Critical)</div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Roll No</th>
                                        <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Student Name</th>
                                        {activeTab === 'roster' ? (
                                            <>
                                                <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Dept/Sem</th>
                                                <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Action</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Evals</th>
                                                <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Avg Mark</th>
                                                <th className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Action</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="hover:bg-white/50 transition-colors group">
                                            <td className="py-4 px-8 text-gray-500 font-mono text-xs">{s.roll_no}</td>
                                            <td className="py-4 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(s.name)}`}>
                                                        {getInitials(s.name)}
                                                    </div>
                                                    <span className="font-bold text-[#111827]">{s.name}</span>
                                                </div>
                                            </td>
                                            {activeTab === 'roster' ? (
                                                <>
                                                    <td className="py-4 px-8 text-gray-500 font-medium text-sm">{s.department || '-'} • Sem {s.semester || '-'}</td>
                                                    <td className="py-4 px-8 text-right">
                                                        <button onClick={() => handleRemove(s.enrollment_id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50" title="Remove Student">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-4 px-8 text-center text-gray-500">
                                                        {s.evaluations?.length || 0}
                                                    </td>
                                                    <td className="py-4 px-8 text-center">
                                                        <span className="font-bold text-xl text-[#111827]">{s.averageMarks !== null ? s.averageMarks : '--'}</span>
                                                    </td>
                                                    <td className="py-4 px-8 text-right">
                                                        <button
                                                            onClick={() => { setEvalStudent(s); setShowEvalModal(true); }}
                                                            className="text-white bg-[#E8B4B8] hover:bg-[#d8a3a7] transition-colors px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm inline-flex items-center gap-1"
                                                        >
                                                            <Plus size={16} /> Add Eval
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {
                showModal && (
                    <div className="fixed inset-0 bg-[#111827]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] p-6 max-w-2xl w-full shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#111827]">Enroll Students</h2>
                                    <p className="text-gray-500 text-sm mt-1">Filter and select students to add to the class Roster.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="grid grid-cols-3 gap-4 mb-6 shrink-0 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                                        value={filterDept} onChange={e => setFilterDept(e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Semester</label>
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                                        value={filterSem} onChange={e => setFilterSem(e.target.value)}
                                    >
                                        <option value="">All Semesters</option>
                                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Section</label>
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                                        value={filterSec} onChange={e => setFilterSec(e.target.value)}
                                    >
                                        <option value="">All Sections</option>
                                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Student List */}
                            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-xl">
                                {availableStudents.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No available students match the filters.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {availableStudents.map(s => (
                                            <li key={s.student_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-[#111827]">{s.name} <span className="text-gray-400 font-mono text-xs ml-2">{s.roll_no}</span></h4>
                                                    <p className="text-xs text-gray-500 mt-1">{s.department || '-'} • Sem {s.semester || '-'} • Sec {s.section || '-'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleEnroll(s.student_id)}
                                                    disabled={loading}
                                                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showEvalModal && evalStudent && (
                    <div className="fixed inset-0 bg-[#111827]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-[#111827]">New Evaluation</h2>
                                <button onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400">{evalStudent.roll_no}</span>
                                <p className="font-semibold text-[#111827]">{evalStudent.name}</p>
                            </div>

                            <form onSubmit={handleAddEval} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Evaluation Name</label>
                                    <input required name="eval_name" type="text" placeholder="e.g. Presentation 1" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all font-medium" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 line-clamp-1" title="Fundamental Knowledge">Fundamental</label>
                                        <input required name="fundamental_knowledge" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="w-full text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 line-clamp-1" title="Core/Technical Skills">Core Skills</label>
                                        <input required name="core_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="w-full text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 line-clamp-1" title="Communication Skills">Communication</label>
                                        <input required name="communication_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="w-full text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 line-clamp-1" title="Soft and Life Skills">Soft Skills</label>
                                        <input required name="soft_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="w-full text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E8B4B8]/50 transition-all text-center" />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 text-sm">
                                    <button type="button" onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loading} className="bg-[#111827] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                                        {loading ? 'Saving...' : 'Save Eval'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Heatmap History Detail View */}
            {
                evalHistoryStudent && (
                    <div className="fixed inset-0 bg-[#111827]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[24px] p-6 max-w-2xl w-full shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-start mb-6 shrink-0 border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(evalHistoryStudent.name)}`}>
                                        {getInitials(evalHistoryStudent.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-2xl font-bold text-[#111827]">{evalHistoryStudent.name}</h2>
                                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{evalHistoryStudent.roll_no}</span>
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium mt-0.5">Performance History</p>
                                    </div>
                                </div>
                                <button onClick={() => setEvalHistoryStudent(null)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto pr-2 space-y-4">
                                {!evalHistoryStudent.evaluations || evalHistoryStudent.evaluations.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No evaluations recorded for this student yet.
                                    </div>
                                ) : (
                                    evalHistoryStudent.evaluations.map((ev, i) => {
                                        const total = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                                        return (
                                            <div key={ev.eval_id || i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                                                    <h3 className="font-bold text-[#111827] flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-[#E8B4B8]"></span>
                                                        {ev.eval_name}
                                                    </h3>
                                                    <div className="flex items-baseline gap-1 text-[#111827]">
                                                        <span className="font-black text-xl">{total.toFixed(1)}</span>
                                                        <span className="text-xs font-bold text-gray-400">/ 40</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fundamental</p>
                                                        <p className="font-bold text-[#111827]">{ev.fundamental_knowledge || 0} <span className="text-gray-400 font-normal text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Core Skills</p>
                                                        <p className="font-bold text-[#111827]">{ev.core_skills || 0} <span className="text-gray-400 font-normal text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Communication</p>
                                                        <p className="font-bold text-[#111827]">{ev.communication_skills || 0} <span className="text-gray-400 font-normal text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Soft Skills</p>
                                                        <p className="font-bold text-[#111827]">{ev.soft_skills || 0} <span className="text-gray-400 font-normal text-xs">/ 10</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
