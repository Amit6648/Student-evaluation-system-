import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Users, BookOpen, Trash2, CheckCircle2, BarChart, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Helper to generate initials
function getInitials(name) {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Helper to get a consistent color based on name string
function getAvatarColor(name) {
    if (!name) return "bg-gray-100 text-gray-700";
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

export default function ClassroomDetail({ currentUser }) {
    const { id } = useParams();

    // Server state
    const [classroom, setClassroom] = useState(null);
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState({ totalStudents: 0, classAvg: '--', topScore: '--' });
    const [dataLoading, setDataLoading] = useState(true);

    // Filter state
    const [activeGroup, setActiveGroup] = useState('A');
    const [activeTab, setActiveTab] = useState("roster");

    // UI state
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [evalStudent, setEvalStudent] = useState(null);
    const [evalHistoryStudent, setEvalHistoryStudent] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchClassroomData = async () => {
        try {
            const res = await fetch(`/api/virtual-classes/${id}`);
            if (res.ok) {
                const data = await res.json();
                setClassroom(data.virtualClass);

                const mappedEnrollments = data.virtualClass.enrollments.map(e => ({
                    enrollment_id: e.id,
                    student_id: e.student.id,
                    name: e.student.name,
                    roll_no: e.student.roll_no,
                    group_label: e.group_label,
                    averageMarks: e.averageMarks,
                    evaluations: e.evaluations
                }));

                setStudents(mappedEnrollments);
            }
        } catch (err) {
            console.error("Failed to fetch classroom data:", err);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchClassroomData();
    }, [id]);

    useEffect(() => {
        // Calculate stats for whatever the current group filter is
        const displayed = students.filter(s => s.group_label === activeGroup);

        let totalClassScore = 0;
        let maxScore = 0;
        let studentsWithScore = 0;

        displayed.forEach(s => {
            if (s.averageMarks !== null) {
                totalClassScore += s.averageMarks;
                maxScore = Math.max(maxScore, s.averageMarks);
                studentsWithScore++;
            }
        });

        const classAvg = studentsWithScore > 0 ? (totalClassScore / studentsWithScore).toFixed(1) : '--';
        const topScore = studentsWithScore > 0 ? maxScore.toFixed(1) : '--';
        setStats({ totalStudents: displayed.length, classAvg, topScore });
    }, [students, activeGroup]);

    async function handleAddEval(e) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        try {
            await fetch('/api/evaluations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollment_id: evalStudent.enrollment_id,
                    eval_name: formData.get("eval_name"),
                    fundamental_knowledge: formData.get("fundamental_knowledge"),
                    core_skills: formData.get("core_skills"),
                    communication_skills: formData.get("communication_skills"),
                    soft_skills: formData.get("soft_skills"),
                })
            });
            await fetchClassroomData();
            setShowEvalModal(false);
            setEvalStudent(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove(enrollmentId) {
        if (confirm("Remove student enrollment? Marks will be lost.")) {
            try {
                await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
                await fetchClassroomData();
            } catch (err) {
                console.error(err);
            }
        }
    }

    if (dataLoading || !classroom) {
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-gray-500">Loading details...</div>;
    }

    const isAdmin = currentUser?.role === 'ADMIN';
    const displayedStudents = students.filter(s => s.group_label === activeGroup);

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto">
            <Link to="/" className="inline-flex items-center text-gray-500 hover:text-[#111827] mb-8 font-semibold transition-colors">
                <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <Badge variant="secondary" className="bg-[#E8B4B8]/10 text-[#E8B4B8] hover:bg-[#E8B4B8]/20 font-bold uppercase tracking-wider text-xs px-3 py-1 rounded-full mb-3 inline-block border-none">
                        {classroom.subject?.course?.school?.name || 'School'} • {classroom.subject?.course?.name || 'Course'}
                    </Badge>
                    <h1 className="text-4xl font-extrabold text-[#111827]">{classroom.subject?.name}</h1>
                    <p className="text-gray-500 mt-2 font-medium">Taught by {classroom.teacher?.name} • Year: {classroom.academic_year}</p>
                </div>

                {/* Group A / Group B Subnavigation Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto mt-4 md:mt-0 shadow-inner">
                    <button
                        onClick={() => setActiveGroup('A')}
                        className={`flex-1 md:w-32 py-2.5 rounded-lg text-sm font-bold transition-all ${activeGroup === 'A' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Group A
                    </button>
                    <button
                        onClick={() => setActiveGroup('B')}
                        className={`flex-1 md:w-32 py-2.5 rounded-lg text-sm font-bold transition-all ${activeGroup === 'B' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Group B
                    </button>
                </div>
            </header>

            {/* Premium Stat Cards for Active Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] shadow-sm flex items-center justify-between py-2 px-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Group {activeGroup} Enrolled</CardTitle>
                        <p className="text-3xl font-black text-[#111827]">{stats.totalStudents}</p>
                    </CardHeader>
                    <CardContent className="p-6 pt-6 pb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <Users size={24} />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] shadow-sm flex items-center justify-between py-2 px-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Group {activeGroup} Avg</CardTitle>
                        <p className="text-3xl font-black text-[#111827]">{stats.classAvg}</p>
                    </CardHeader>
                    <CardContent className="p-6 pt-6 pb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                            <BarChart size={24} />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] shadow-sm flex items-center justify-between py-2 px-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Group {activeGroup} Top</CardTitle>
                        <p className="text-3xl font-black text-[#111827]">{stats.topScore}</p>
                    </CardHeader>
                    <CardContent className="p-6 pt-6 pb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={24} />
                        </div>
                    </CardContent>
                </Card>
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
                    {displayedStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users size={24} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium mb-4">No students enrolled in Group {activeGroup} yet.</p>
                        </div>
                    ) : activeTab === 'heatmap' ? (
                        <div className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {displayedStudents.map((s) => {
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
                            <Table className="w-full text-left">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                        <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest">Roll No</TableHead>
                                        <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest">Student Name</TableHead>
                                        {activeTab === 'roster' ? (
                                            <>
                                                {isAdmin && <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Admin Action</TableHead>}
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Evals</TableHead>
                                                <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Avg Mark</TableHead>
                                                {!isAdmin && <TableHead className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Evaluate</TableHead>}
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedStudents.map((s) => (
                                        <TableRow key={s.student_id} className="hover:bg-white/50 transition-colors group">
                                            <TableCell className="py-4 px-8 text-gray-500 font-mono text-xs border-b border-gray-50">{s.roll_no}</TableCell>
                                            <TableCell className="py-4 px-8 border-b border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(s.name)}`}>
                                                        {getInitials(s.name)}
                                                    </div>
                                                    <span className="font-bold text-[#111827]">{s.name}</span>
                                                </div>
                                            </TableCell>
                                            {activeTab === 'roster' ? (
                                                <>
                                                    {isAdmin && (
                                                        <TableCell className="py-4 px-8 text-right border-b border-gray-50">
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemove(s.enrollment_id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50" title="Remove Student">
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="py-4 px-8 text-center text-gray-500 border-b border-gray-50">
                                                        {s.evaluations?.length || 0}
                                                    </TableCell>
                                                    <TableCell className="py-4 px-8 text-center border-b border-gray-50">
                                                        <span className="font-bold text-xl text-[#111827]">{s.averageMarks !== null ? s.averageMarks : '--'}</span>
                                                    </TableCell>
                                                    {!isAdmin && (
                                                        <TableCell className="py-4 px-8 text-right border-b border-gray-50">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => { setEvalStudent(s); setShowEvalModal(true); }}
                                                                className="text-white bg-[#E8B4B8] hover:bg-[#d8a3a7] transition-colors rounded-lg font-semibold shadow-sm inline-flex items-center gap-1"
                                                            >
                                                                <Plus size={16} /> Add Eval
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showEvalModal} onOpenChange={(open) => { if (!open) { setShowEvalModal(false); setEvalStudent(null); } }}>
                <DialogContent className="sm:max-w-sm rounded-[24px] p-8 border-none shadow-2xl">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold text-[#111827]">New Evaluation</DialogTitle>
                    </DialogHeader>

                    {evalStudent && (
                        <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-xs uppercase font-bold text-gray-400">{evalStudent.roll_no}</span>
                            <p className="font-semibold text-[#111827]">{evalStudent.name}</p>
                        </div>
                    )}

                    <form onSubmit={handleAddEval} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Evaluation Name</label>
                            <Input required name="eval_name" placeholder="e.g. Presentation 1" className="h-11 rounded-xl bg-gray-50 focus-visible:ring-[#E8B4B8]/50 border-gray-200 font-medium" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest line-clamp-1" title="Fundamental Knowledge">Fundamental</label>
                                <Input required name="fundamental_knowledge" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="h-11 text-lg font-bold border-gray-200 rounded-xl bg-gray-50 focus-visible:ring-[#E8B4B8]/50 text-center" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest line-clamp-1" title="Core/Technical Skills">Core Skills</label>
                                <Input required name="core_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="h-11 text-lg font-bold border-gray-200 rounded-xl bg-gray-50 focus-visible:ring-[#E8B4B8]/50 text-center" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest line-clamp-1" title="Communication Skills">Communication</label>
                                <Input required name="communication_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="h-11 text-lg font-bold border-gray-200 rounded-xl bg-gray-50 focus-visible:ring-[#E8B4B8]/50 text-center" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest line-clamp-1" title="Soft and Life Skills">Soft Skills</label>
                                <Input required name="soft_skills" type="number" step="0.5" max="10" min="0" placeholder="0 - 10" className="h-11 text-lg font-bold border-gray-200 rounded-xl bg-gray-50 focus-visible:ring-[#E8B4B8]/50 text-center" />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 sm:justify-end gap-3 mt-4">
                            <Button type="button" variant="ghost" onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="rounded-xl h-11 px-5 text-gray-600 font-semibold hover:bg-gray-100">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-xl h-11 px-6 bg-[#111827] text-white font-semibold hover:bg-gray-800">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Saving...' : 'Save Eval'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!evalHistoryStudent} onOpenChange={(open) => { if (!open) setEvalHistoryStudent(null) }}>
                <DialogContent className="sm:max-w-2xl rounded-[24px] p-6 border-none shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                    {evalHistoryStudent && (
                        <>
                            <DialogHeader className="flex flex-row justify-between items-start mb-2 shrink-0 border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(evalHistoryStudent.name)}`}>
                                        {getInitials(evalHistoryStudent.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <DialogTitle className="text-2xl font-bold text-[#111827]">{evalHistoryStudent.name}</DialogTitle>
                                            <Badge variant="secondary" className="font-mono bg-gray-100 text-gray-500 rounded-md py-0">{evalHistoryStudent.roll_no}</Badge>
                                        </div>
                                        <DialogDescription className="font-medium mt-0.5">Performance History</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="overflow-y-auto pr-2 space-y-4 flex-1 mt-4">
                                {!evalHistoryStudent.evaluations || evalHistoryStudent.evaluations.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No evaluations recorded for this student yet.
                                    </div>
                                ) : (
                                    evalHistoryStudent.evaluations.map((ev, i) => {
                                        const total = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                                        return (
                                            <Card key={ev.id || i} className="border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow py-2 px-1">
                                                <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-gray-50">
                                                    <CardTitle className="text-base font-bold text-[#111827] flex items-center gap-2 m-0 p-0">
                                                        <span className="w-2 h-2 rounded-full bg-[#E8B4B8]"></span>
                                                        {ev.eval_name}
                                                    </CardTitle>
                                                    <div className="flex items-baseline gap-1 text-[#111827]">
                                                        <span className="font-black text-xl">{total.toFixed(1)}</span>
                                                        <span className="text-xs font-bold text-gray-400">/ 40</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 pb-2">
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
                                                </CardContent>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
