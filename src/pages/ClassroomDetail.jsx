import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Users, BookOpen, Trash2, CheckCircle2, BarChart, Loader2, UserPlus, Calendar as CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    if (!name) return "bg-[#F8F9FA] text-gray-700";
    const colors = [
        "bg-zinc-100 text-zinc-800",
        "bg-emerald-100 text-emerald-700",
        "bg-amber-100 text-amber-700",
        "bg-zinc-100 text-zinc-700",
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
    const [selectedDate, setSelectedDate] = useState(() => {
        const td = new Date();
        if (td.getDay() === 0) return new Date(td.getTime() - 86400000 * 2); // Force to Friday if Sunday
        if (td.getDay() === 6) return new Date(td.getTime() - 86400000); // Force to Friday if Saturday
        return td;
    });

    const isWeekend = selectedDate && (selectedDate.getDay() === 0 || selectedDate.getDay() === 6);
    
    // Future date clamp (strip time to evaluate pure dates)
    const isFutureDate = () => {
        if (!selectedDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        return sel > today;
    };
    
    const isInvalidDate = isWeekend || isFutureDate();

    const getEvalForDate = (studentEvals) => {
        if (!studentEvals) return null;
        const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
        return studentEvals.find(ev => {
            if (!ev.evaluation_date) return false;
            // Native string-slice isolates identical Date strings bypassing all local browser +05:30 UTC cast anomalies
            return ev.evaluation_date.split('T')[0] === targetDateStr;
        });
    };

    // UI state
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [evalStudent, setEvalStudent] = useState(null);
    const [evalHistoryStudent, setEvalHistoryStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

    // Eligible students state
    const [eligibleStudents, setEligibleStudents] = useState([]);
    const [batchGroup, setBatchGroup] = useState('A');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('all'); // 'all' or 'average'
    const [exportTopN, setExportTopN] = useState(3);

    const handleExport = () => {
        let exportData = [];
        // Export the entirety of the classroom un-filtered by the current UI Tab
        const displayed = students;

        if (exportMode === 'all') {
            // Collect all unique dates across all students to form columns
            const allDates = new Set();
            displayed.forEach(s => {
                if(s.evaluations) {
                    s.evaluations.forEach(ev => {
                        const d = format(new Date(ev.evaluation_date), 'MMM d, yyyy');
                        allDates.add(d);
                    });
                }
            });
            const dateColumns = Array.from(allDates).sort();

            exportData = displayed.map(s => {
                const row = {
                    "Roll No": s.roll_no,
                    "Student Name": s.name,
                    "Group": s.group_label,
                };
                
                // Fill individual marks for every logged date
                dateColumns.forEach(dateLabel => {
                   const ev = s.evaluations?.find(e => format(new Date(e.evaluation_date), 'MMM d, yyyy') === dateLabel);
                   if(ev) {
                       row[dateLabel] = ev.fundamental_knowledge + ev.core_skills + ev.communication_skills + ev.soft_skills;
                   } else {
                       row[dateLabel] = "-";
                   }
                });
                row["Overall Average"] = s.averageMarks !== null ? s.averageMarks : "-";
                return row;
            });

        } else if (exportMode === 'average') {
            exportData = displayed.map(s => {
                const row = {
                    "Roll No": s.roll_no,
                    "Student Name": s.name,
                    "Group": s.group_label,
                };
                
                if(!s.evaluations || s.evaluations.length === 0) {
                    row[`Top ${exportTopN} Average`] = "-";
                    return row;
                }

                // Parse topological arrays mathematically sorting values
                const totals = s.evaluations.map(ev => ev.fundamental_knowledge + ev.core_skills + ev.communication_skills + ev.soft_skills);
                totals.sort((a,b) => b - a); // descending
                const topScores = totals.slice(0, exportTopN);
                const sum = topScores.reduce((acc, val) => acc + val, 0);
                const avg = topScores.length > 0 ? (sum / topScores.length).toFixed(2) : "-";
                
                row[`Top ${exportTopN} Average`] = avg;
                return row;
            });
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        const sheetName = exportMode === 'all' ? 'All Data' : `Top ${exportTopN} Avg`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const fileName = `${classroom?.subject?.name || 'Class'}_Full_Roster_Export.xlsx`;
        XLSX.writeFile(wb, fileName);
        setShowExportModal(false);
    };

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

    const fetchEligibleStudents = async () => {
        try {
            const res = await fetch(`/api/eligible-students/${id}`);
            if (res.ok) {
                const data = await res.json();
                setEligibleStudents(data);
            }
        } catch (err) {
            console.error("Failed to fetch eligible students:", err);
        }
    };

    useEffect(() => {
        fetchClassroomData();
        fetchEligibleStudents();
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
        
        // Pass standard noon UTC equivalent preventing day-shifting
        const evalDateStr = format(selectedDate, "yyyy-MM-dd'T'12:00:00.000'Z'");

        try {
            await fetch('/api/evaluations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollment_id: evalStudent.enrollment_id,
                    evaluation_date: evalDateStr,
                    eval_name: formData.get("eval_name"),
                    fundamental_knowledge: formData.get("fundamental_knowledge"),
                    core_skills: formData.get("core_skills"),
                    communication_skills: formData.get("communication_skills"),
                    soft_skills: formData.get("soft_skills"),
                    remarks: "Evaluated on " + format(selectedDate, 'MMM d, yyyy')
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

    async function executeRemoveStudent(enrollmentId) {
        try {
            await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
            await fetchClassroomData();
            setEnrollmentToDelete(null);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleEnrollSubmit(e) {
        e.preventDefault();
        if (selectedStudentIds.length === 0) {
            alert("Please select at least one student to enroll.");
            return;
        }

        setLoading(true);
        try {
            await fetch('/api/enroll-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    virtual_class_id: id,
                    group_label: batchGroup,
                    student_ids: selectedStudentIds
                })
            });
            await fetchClassroomData();
            await fetchEligibleStudents(); // Refresh lists
            setShowEnrollModal(false);
            setSelectedStudentIds([]); // Clear selection
            // Keep batchGroup as is for convenience
        } catch (err) {
            console.error("Failed to batch enroll students", err);
        } finally {
            setLoading(false);
        }
    }

    if (dataLoading || !classroom) {
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-[#64748B]">Loading details...</div>;
    }

    const isAdmin = currentUser?.role === 'ADMIN';
    const displayedStudents = students.filter(s => s.group_label === activeGroup);

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto relative pl-12 border-l-[4px] border-[#0088FF] shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
            <Link to="/" className="inline-flex items-center text-[#111827]/70 hover:text-[#0088FF] mb-8 font-bold transition-colors">
                <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sticky top-0 z-50 pt-2 pb-4 backdrop-blur-xl bg-[#F0F4F8]/80 border-b border-[#111827]/10">
                <div>
                    <Badge variant="secondary" className="bg-[#5D685C] text-white hover:bg-[#5D685C]/90 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-sm mb-3 inline-block border-none">
                        {classroom.subject?.course?.school?.name || 'School'} • {classroom.subject?.course?.name || 'Course'}
                    </Badge>
                    <h1 className="text-4xl font-extrabold text-[#111827] leading-tight">{classroom.subject?.name}</h1>
                    <p className="text-[#111827]/70 mt-3 font-semibold text-lg flex items-center gap-3">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5D685C] block"></span> Teacher: {classroom.teacher?.name}</span>
                        <span className="opacity-50">•</span>
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#767472] block"></span> Year: {classroom.academic_year}</span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4 mt-4 md:mt-0">
                    <div className="flex flex-col items-start gap-1.5 focus-within:ring-2 rounded-full focus-within:ring-[#0088FF]/30 transition-all">
                        <label className="text-[10px] font-black tracking-widest uppercase text-[#111827]/50 ml-2">Evaluation Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal rounded-full border border-[#111827]/10 shadow-sm h-11 bg-white hover:bg-[#F0F4F8] transition-colors focus-visible:ring-0",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-4 w-4 text-[#0088FF]" />
                                    {selectedDate ? <span className="font-bold text-[#111827]">{format(selectedDate, "PPP")}</span> : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl bg-white" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => { if (date) setSelectedDate(date); }}
                                    initialFocus
                                    className="p-3"
                                    disabled={(date) => {
                                        const td = new Date();
                                        td.setHours(0, 0, 0, 0);
                                        const d = new Date(date);
                                        d.setHours(0, 0, 0, 0);
                                        return d.getDay() === 0 || d.getDay() === 6 || d > td;
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Group A / Group B Subnavigation Toggle */}
                    <div className="flex bg-[#E8EEF4] p-1.5 rounded-full w-full md:w-auto shadow-sm border border-[#111827]/5">
                        <button
                            onClick={() => setActiveGroup('A')}
                            className={`flex-1 md:w-32 py-2.5 rounded-full text-sm font-bold transition-all ${activeGroup === 'A' ? 'bg-[#767472] text-white shadow-md' : 'text-[#111827]/60 hover:text-[#111827]'}`}
                        >
                            Group A
                        </button>
                        <button
                            onClick={() => setActiveGroup('B')}
                            className={`flex-1 md:w-32 py-2.5 rounded-full text-sm font-bold transition-all ${activeGroup === 'B' ? 'bg-[#767472] text-white shadow-md' : 'text-[#111827]/60 hover:text-[#111827]'}`}
                        >
                            Group B
                        </button>
                    </div>
                </div>

                {isAdmin && (
                    <Button onClick={() => setShowEnrollModal(true)} className="mt-4 md:mt-0 bg-[#767472] hover:bg-[#5f5d5b] text-white shadow-md rounded-full flex items-center gap-2 font-bold px-6 h-12 transition-all hover:scale-[1.02]">
                        <UserPlus className="w-5 h-5" />
                        Enroll Students
                    </Button>
                )}
            </header>

            {/* Compact Stat Cards for Active Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#E8EEF4] border border-[#111827]/5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-white text-[#0088FF] flex items-center justify-center shrink-0 shadow-sm border border-[#111827]/5">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest">Group {activeGroup} Enrolled</p>
                        <p className="text-2xl font-black text-[#111827] leading-tight">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-[#E8EEF4] border border-[#111827]/5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-white text-[#0088FF] flex items-center justify-center shrink-0 shadow-sm border border-[#111827]/5">
                        <BarChart size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest">Group {activeGroup} Avg</p>
                        <p className="text-2xl font-black text-[#111827] leading-tight">{stats.classAvg}</p>
                    </div>
                </div>
                <div className="bg-[#E8EEF4] border border-[#111827]/5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-white text-[#0088FF] flex items-center justify-center shrink-0 shadow-sm border border-[#111827]/5">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest">Group {activeGroup} Top</p>
                        <p className="text-2xl font-black text-[#111827] leading-tight">{stats.topScore}</p>
                    </div>
                </div>
            </div >

            <div className="bg-[#E8EEF4] border border-[#111827]/5 rounded-2xl shadow-sm flex flex-col mb-12 overflow-hidden">
                {/* Tabs */}
                <div className="flex justify-between items-center border-b border-[#111827]/5 px-6 pt-4 bg-[#F0F4F8]/30 overflow-x-auto">
                    <div className="flex shrink-0">
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`px-6 py-4 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'roster' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-[#111827]/50 hover:text-[#111827]'}`}
                        >
                            <Users size={18} className={activeTab === 'roster' ? 'text-[#0088FF]' : ''} />
                            Student Roster
                        </button>
                        <button
                            onClick={() => setActiveTab('gradebook')}
                            className={`px-6 py-4 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'gradebook' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-[#111827]/50 hover:text-[#111827]'}`}
                        >
                            <BookOpen size={18} className={activeTab === 'gradebook' ? 'text-[#0088FF]' : ''} />
                            Gradebook
                        </button>
                        <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`px-6 py-4 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'heatmap' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-[#111827]/50 hover:text-[#111827]'}`}
                        >
                            <BarChart size={18} className={activeTab === 'heatmap' ? 'text-[#0088FF]' : ''} />
                            Performance Heatmap
                        </button>
                    </div>
                    {/* Excel Export Button Integration */}
                    {activeTab !== 'heatmap' && (
                        <Button onClick={() => setShowExportModal(true)} variant="outline" className="h-9 rounded-full font-bold shadow-sm flex items-center gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 shrink-0 ml-4">
                            <Download size={16} /> Export to Excel
                        </Button>
                    )}
                </div>

                {/* Content */}
                <div className="p-0 flex-1 flex flex-col">
                    {displayedStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <Users size={24} className="text-[#111827]/30" />
                            </div>
                            <p className="text-[#111827]/60 font-bold mb-4">No students enrolled in Group {activeGroup} yet.</p>
                        </div>
                    ) : activeTab === 'heatmap' ? (
                        <div className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {displayedStudents.map((s) => {
                                    let colorClass = "bg-[#F8F9FA] text-[#64748B] border-gray-200"; // No Marks

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
                                            className={`p-5 rounded-3xl border ${colorClass} flex flex-col justify-between aspect-square transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 shadow-sm hover:shadow-xl cursor-pointer`}
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
                            <div className="mt-8 flex gap-6 text-xs font-bold text-[#111827]/60 items-center justify-center bg-[#F0F4F8]/80 py-3 rounded-full border border-[#111827]/5">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-200"></div> &ge; 32 (High)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-200"></div> 24 - 31 (Average)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-100 border border-orange-200"></div> 16 - 23 (Low)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-100 border border-red-200"></div> &lt; 16 (Critical)</div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-[#E8EEF4]">
                            <Table className="w-full text-left">
                                <TableHeader>
                                    <TableRow className="bg-[#E8EEF4] border-b border-[#111827]/10 hover:bg-[#E8EEF4]">
                                        <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest">Roll No</TableHead>
                                        <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest">Student Name</TableHead>
                                        {activeTab === 'roster' ? (
                                            <>
                                                {isAdmin && <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest text-right">Admin Action</TableHead>}
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest text-center">Status</TableHead>
                                                <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest text-center">Daily Score</TableHead>
                                                {!isAdmin && <TableHead className="py-4 px-8 text-[10px] font-bold text-[#111827]/50 uppercase tracking-widest text-right">Evaluate</TableHead>}
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedStudents.map((s) => (
                                        <TableRow key={s.student_id} className="hover:bg-white/40 transition-colors border-b border-[#111827]/5 group">
                                            <TableCell className="py-4 px-8 text-[#111827]/60 font-mono font-bold text-xs">{s.roll_no}</TableCell>
                                            <TableCell className="py-4 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${getAvatarColor(s.name)}`}>
                                                        {getInitials(s.name)}
                                                    </div>
                                                    <span className="font-bold text-[#111827]">{s.name}</span>
                                                </div>
                                            </TableCell>
                                            {activeTab === 'roster' ? (
                                                <>
                                                    {isAdmin && (
                                                        <TableCell className="py-4 px-8 text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setEnrollmentToDelete(s.enrollment_id)} className="text-[#111827]/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" title="Remove Student">
                                                                <Trash2 size={18} />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {(() => {
                                                        const evForDate = getEvalForDate(s.evaluations);
                                                        const dateTotal = evForDate ? (evForDate.fundamental_knowledge + evForDate.core_skills + evForDate.communication_skills + evForDate.soft_skills) : null;
                                                        
                                                        return (
                                                            <>
                                                                <TableCell className="py-4 px-8 text-center font-bold text-[#111827]/60">
                                                                    {evForDate ? <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Graded</div> : <div className="text-amber-500 opacity-60">Pending</div>}
                                                                </TableCell>
                                                                <TableCell className="py-4 px-8 text-center">
                                                                    <span className="font-extrabold text-xl text-[#0088FF]">{dateTotal !== null ? dateTotal : '--'}</span>
                                                                </TableCell>
                                                                {!isAdmin && (
                                                                    <TableCell className="py-4 px-8 text-right">
                                                                        {isInvalidDate ? (
                                                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                                                                                <CalendarIcon size={12}/> {isFutureDate() ? 'Future Locked' : 'Weekend Locked'}
                                                                            </span>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => { setEvalStudent(s); setShowEvalModal(true); }}
                                                                                className={evForDate ? "text-[#111827]/60 bg-transparent border border-[#111827]/20 hover:bg-[#F0F4F8] transition-colors rounded-full font-bold shadow-sm inline-flex items-center gap-1 px-4" : "text-white bg-[#767472] hover:bg-[#5f5d5b] transition-colors rounded-full font-bold shadow-sm inline-flex items-center gap-1 px-4"}
                                                                            >
                                                                                <Plus size={16} /> {evForDate ? 'Edit Eval' : 'Add Eval'}
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
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
                <DialogContent className="sm:max-w-sm rounded-[24px] p-8 border-none shadow-2xl bg-[#E8EEF4] relative">
                    <div className="absolute top-0 left-0 bg-[#5D685C] text-white px-5 py-2.5 rounded-br-xl font-bold flex items-center gap-2 shadow-sm z-10 text-xs uppercase tracking-wider">
                        Evaluation
                    </div>
                    <DialogHeader className="mb-2 mt-6 border-b border-[#111827]/10 pb-4">
                        <DialogTitle className="text-2xl font-black text-[#111827]">New Evaluation</DialogTitle>
                    </DialogHeader>

                    {evalStudent && (
                        <div className="mb-1 bg-[#F0F4F8] p-4 rounded-xl border border-[#111827]/5 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${getAvatarColor(evalStudent.name)}`}>
                                {getInitials(evalStudent.name)}
                            </div>
                            <div>
                                <p className="font-bold text-[#111827] line-clamp-1">{evalStudent.name}</p>
                                <span className="text-xs uppercase font-bold text-[#111827]/50 tracking-widest">{evalStudent.roll_no}</span>
                            </div>
                        </div>
                    )}

                    <form key={evalStudent?.student_id + format(selectedDate, 'yyyy-MM-dd')} onSubmit={handleAddEval} className="space-y-5 pt-2">
                        {(() => {
                            const currentEval = evalStudent ? getEvalForDate(evalStudent.evaluations) : null;
                            return (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#111827] uppercase tracking-wider ml-1">Evaluation Title</label>
                                        <Input required name="eval_name" defaultValue={currentEval?.eval_name || ''} placeholder={`e.g. Daily Evaluation - ${format(selectedDate, 'MMM d')}`} className="h-12 rounded-full bg-white border-none shadow-sm focus-visible:ring-2 focus-visible:ring-[#0088FF] font-medium px-5" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5 focus-within:text-[#0088FF] transition-colors">
                                            <label className="block text-[9px] font-black text-[#111827]/50 uppercase tracking-widest line-clamp-1 ml-1" title="Fundamental Knowledge">Fundamental</label>
                                            <Input required name="fundamental_knowledge" defaultValue={currentEval?.fundamental_knowledge ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-white border-none shadow-sm rounded-2xl focus-visible:ring-2 focus-visible:ring-[#0088FF] text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-[#0088FF] transition-colors">
                                            <label className="block text-[9px] font-black text-[#111827]/50 uppercase tracking-widest line-clamp-1 ml-1" title="Core/Technical Skills">Core Skills</label>
                                            <Input required name="core_skills" defaultValue={currentEval?.core_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-white border-none shadow-sm rounded-2xl focus-visible:ring-2 focus-visible:ring-[#0088FF] text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-[#0088FF] transition-colors">
                                            <label className="block text-[9px] font-black text-[#111827]/50 uppercase tracking-widest line-clamp-1 ml-1" title="Communication Skills">Communication</label>
                                            <Input required name="communication_skills" defaultValue={currentEval?.communication_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-white border-none shadow-sm rounded-2xl focus-visible:ring-2 focus-visible:ring-[#0088FF] text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-[#0088FF] transition-colors">
                                            <label className="block text-[9px] font-black text-[#111827]/50 uppercase tracking-widest line-clamp-1 ml-1" title="Soft and Life Skills">Soft Skills</label>
                                            <Input required name="soft_skills" defaultValue={currentEval?.soft_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-white border-none shadow-sm rounded-2xl focus-visible:ring-2 focus-visible:ring-[#0088FF] text-center" />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <DialogFooter className="pt-6 sm:justify-end gap-3 mt-4 border-t border-[#111827]/10">
                            <Button type="button" variant="ghost" onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="rounded-full h-12 px-6 text-[#111827]/60 font-bold hover:bg-white hover:text-[#111827] shadow-sm">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-full h-12 px-8 bg-[#767472] text-white font-bold hover:bg-[#5f5d5b] shadow-md transition-all">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Saving...' : 'Save Eval'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Excel Export Configuration Modal */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                <DialogContent className="sm:max-w-md rounded-[24px] p-8 border-none shadow-2xl bg-white">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-black text-[#111827]">Export Data to Excel</DialogTitle>
                        <DialogDescription className="font-bold text-[#111827]/50 mt-1 uppercase tracking-widest text-[10px]">Generate localized .XLSX spreadsheets</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[#111827] uppercase tracking-wider">Export Format Mode</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 border p-4 rounded-xl cursor-pointer transition-all ${exportMode === 'all' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-[#111827]/10 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input type="radio" value="all" checked={exportMode === 'all'} onChange={() => setExportMode('all')} className="accent-emerald-600" />
                                        <span className="font-bold text-[#111827] text-sm">Full Data Matrix</span>
                                    </div>
                                    <p className="text-[10px] text-[#111827]/50 font-semibold uppercase tracking-wider leading-tight ml-5">Every daily evaluation individually parsed.</p>
                                </label>
                                <label className={`flex-1 border p-4 rounded-xl cursor-pointer transition-all ${exportMode === 'average' ? 'border-[#0088FF] bg-[#0088FF]/5 shadow-sm' : 'border-[#111827]/10 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input type="radio" value="average" checked={exportMode === 'average'} onChange={() => setExportMode('average')} className="accent-[#0088FF]" />
                                        <span className="font-bold text-[#111827] text-sm">Top-N Average</span>
                                    </div>
                                    <p className="text-[10px] text-[#111827]/50 font-semibold uppercase tracking-wider leading-tight ml-5">Averages specific highest scoring entries.</p>
                                </label>
                            </div>
                        </div>

                        {exportMode === 'average' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 bg-[#F0F4F8] p-4 rounded-2xl border border-[#111827]/5">
                                <label className="text-[10px] font-black tracking-widest text-[#111827]/50 uppercase text-center block mb-2">Extract Highest 'N' Outcomes</label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    value={exportTopN} 
                                    onChange={(e) => setExportTopN(parseInt(e.target.value) || 1)} 
                                    className="h-14 rounded-xl bg-white border-transparent shadow-sm font-black text-center text-xl focus-visible:ring-2 focus-visible:ring-[#0088FF] transition-all"
                                />
                                <p className="text-center text-[10px] font-bold text-[#111827]/40 mt-2">Will structurally sort and exclusively average the {exportTopN || 1} highest evaluations per student.</p>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="mt-8 pt-5 border-t border-[#111827]/5 gap-3">
                        <Button variant="ghost" onClick={() => setShowExportModal(false)} className="rounded-full h-12 px-6 font-bold text-[#111827]/60 hover:bg-[#F0F4F8] transition-colors">Cancel</Button>
                        <Button onClick={handleExport} className="rounded-full h-12 px-8 bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]">
                            <Download size={18} /> Generate .XLSX
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!evalHistoryStudent} onOpenChange={(open) => { if (!open) setEvalHistoryStudent(null) }}>
                <DialogContent className="sm:max-w-2xl rounded-[24px] p-8 border-none shadow-2xl overflow-hidden max-h-[85vh] flex flex-col bg-[#E8EEF4] relative">
                    <div className="absolute top-0 right-0 bg-[#5D685C] text-white px-5 py-2.5 rounded-bl-xl font-bold flex items-center gap-2 shadow-sm z-10 text-xs uppercase tracking-wider">
                        History
                    </div>
                    {evalHistoryStudent && (
                        <>
                            <DialogHeader className="flex flex-row justify-between items-start mb-2 shrink-0 border-b border-[#111827]/10 pb-6 mt-4">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-sm ${getAvatarColor(evalHistoryStudent.name)}`}>
                                        {getInitials(evalHistoryStudent.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <DialogTitle className="text-3xl font-black text-[#111827] leading-none">{evalHistoryStudent.name}</DialogTitle>
                                            <Badge variant="secondary" className="font-mono bg-white text-[#111827]/60 rounded-md py-0 shadow-sm border border-[#111827]/5">{evalHistoryStudent.roll_no}</Badge>
                                        </div>
                                        <DialogDescription className="font-bold text-[#111827]/50 mt-1 uppercase tracking-widest text-[10px]">Performance History</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="overflow-y-auto pr-2 space-y-4 flex-1 mt-4">
                                {!evalHistoryStudent.evaluations || evalHistoryStudent.evaluations.length === 0 ? (
                                    <div className="py-12 text-center text-[#111827]/50 font-bold bg-[#F0F4F8] rounded-2xl border border-dashed border-[#111827]/10">
                                        No evaluations recorded for this student yet.
                                    </div>
                                ) : (
                                    evalHistoryStudent.evaluations.map((ev, i) => {
                                        const total = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                                        return (
                                            <Card key={ev.id || i} className="border-none bg-white rounded-2xl shadow-sm hover:shadow-md transition-all py-2 px-1">
                                                <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-[#111827]/5">
                                                    <CardTitle className="text-lg font-black text-[#111827] flex items-center gap-3 m-0 p-0">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0088FF]"></span>
                                                        {ev.eval_name}
                                                    </CardTitle>
                                                    <div className="flex items-baseline gap-1 text-[#111827] bg-[#F0F4F8] px-3 py-1 rounded-full border border-[#111827]/5">
                                                        <span className="font-black text-xl">{total.toFixed(1)}</span>
                                                        <span className="text-xs font-bold text-[#111827]/50">/ 40</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 pb-2">
                                                    <div className="bg-[#E8EEF4] rounded-xl p-3 border-none">
                                                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest mb-1.5">Fundamental</p>
                                                        <p className="font-black text-lg text-[#111827]">{ev.fundamental_knowledge || 0} <span className="text-[#111827]/40 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-[#E8EEF4] rounded-xl p-3 border-none">
                                                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest mb-1.5">Core Skills</p>
                                                        <p className="font-black text-lg text-[#111827]">{ev.core_skills || 0} <span className="text-[#111827]/40 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-[#E8EEF4] rounded-xl p-3 border-none">
                                                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest mb-1.5">Communication</p>
                                                        <p className="font-black text-lg text-[#111827]">{ev.communication_skills || 0} <span className="text-[#111827]/40 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-[#E8EEF4] rounded-xl p-3 border-none">
                                                        <p className="text-[9px] font-black text-[#111827]/50 uppercase tracking-widest mb-1.5">Soft Skills</p>
                                                        <p className="font-black text-lg text-[#111827]">{ev.soft_skills || 0} <span className="text-[#111827]/40 font-bold text-xs">/ 10</span></p>
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
            <Dialog open={showEnrollModal} onOpenChange={(open) => {
                setShowEnrollModal(open);
                if (!open) setSelectedStudentIds([]);
            }}>
                <DialogContent className="sm:max-w-xl rounded-[24px] p-8 md:p-10 border-none shadow-2xl bg-[#E8EEF4] relative">
                    <div className="absolute top-0 left-0 bg-[#5D685C] text-white px-5 py-2.5 rounded-br-xl font-bold flex items-center gap-2 shadow-sm z-10 text-xs uppercase tracking-wider">
                        Enrollment
                    </div>
                    <DialogHeader className="mt-6 border-b border-[#111827]/10 pb-4">
                        <DialogTitle className="text-3xl font-black text-[#111827] flex items-center gap-3">
                            <Users size={28} className="text-[#0088FF]" />
                            Batch Enroll
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-[#111827]/70 font-semibold">
                            Administer student roster for Section {classroom?.section}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEnrollSubmit} className="space-y-6 mt-4">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[#111827] uppercase tracking-widest ml-1">1. Target Enrollment Group</label>
                            <div className="flex bg-[#F0F4F8] p-1.5 rounded-full w-full shadow-sm border border-[#111827]/5">
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('A')}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${batchGroup === 'A' ? 'bg-[#767472] text-white shadow-md' : 'text-[#111827]/50 hover:text-[#111827]'}`}
                                >
                                    Group A
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('B')}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${batchGroup === 'B' ? 'bg-[#767472] text-white shadow-md' : 'text-[#111827]/50 hover:text-[#111827]'}`}
                                >
                                    Group B
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[#111827] uppercase tracking-widest ml-1 flex justify-between">
                                2. Select Students
                                <span className="text-[10px] opacity-50">{eligibleStudents.length} available</span>
                            </label>
                            <div className="bg-[#F0F4F8] border border-[#111827]/10 rounded-2xl p-4 max-h-[300px] overflow-y-auto shadow-sm">
                                {eligibleStudents.length === 0 ? (
                                    <p className="text-[#64748B] text-sm text-center py-4 italic">No eligible students found in the system for this course and semester.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {eligibleStudents.map((student) => {
                                            const existingEnrollment = students.find(s => s.student_id === student.id);
                                            const isAssigned = !!existingEnrollment;

                                            // As requested, green styling for already assigned students.
                                            const containerClasses = isAssigned
                                                ? "bg-green-50/50 border-green-200"
                                                : "bg-white border-gray-100 hover:border-[#18181b]/40";

                                            return (
                                                <div key={student.id} className={`flex justify-between items-center p-3 rounded-xl shadow-sm border transition-colors ${containerClasses}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded text-[#111827] border-gray-300 focus:ring-[#18181b]"
                                                            checked={selectedStudentIds.includes(student.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                                                                else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                            }}
                                                        />
                                                        <div>
                                                            <p className={`font-semibold ${isAssigned ? 'text-green-800' : 'text-gray-800'}`}>{student.name}</p>
                                                            <p className={`text-xs ${isAssigned ? 'text-green-600' : 'text-[#64748B]'}`}>{student.roll_no}</p>
                                                        </div>
                                                    </div>
                                                    {isAssigned && (
                                                        <Badge variant="secondary" className="bg-green-100/80 text-green-700 border-none font-bold shadow-sm">
                                                            Currently: Group {existingEnrollment.group_label}
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-3 sm:justify-end pt-6 mt-4 border-t border-[#111827]/10">
                            <Button type="button" variant="ghost" className="rounded-full h-12 px-6 text-[#111827]/60 font-bold hover:bg-white hover:text-[#111827] shadow-sm" onClick={() => setShowEnrollModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || selectedStudentIds.length === 0} className="rounded-full h-12 px-8 bg-[#767472] text-white font-bold hover:bg-[#5f5d5b] shadow-md transition-all">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''} Enrollments
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!enrollmentToDelete} onOpenChange={(open) => !open && setEnrollmentToDelete(null)}>
                <DialogContent className="sm:max-w-md rounded-[24px] p-6 text-center border-none shadow-2xl bg-[#E8EEF4]">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-white shrink-0 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <Trash2 size={28} />
                        </div>
                        <DialogTitle className="text-3xl font-black text-[#111827]">Remove Student?</DialogTitle>
                        <DialogDescription className="pt-3 text-[#111827]/70 font-semibold pb-6">
                            Are you sure you want to remove this student from the classroom? <br /><br />
                            <span className="text-red-500 font-bold bg-white px-3 py-1.5 rounded-lg border border-red-100 inline-block">All recorded marks and evaluation history will be permanently lost!</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-center gap-4 border-t border-[#111827]/10 pt-6">
                        <Button type="button" variant="ghost" className="rounded-full px-8 h-12 font-bold hover:bg-white text-[#111827]/60 hover:text-[#111827]" onClick={() => setEnrollmentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => executeRemoveStudent(enrollmentToDelete)}
                            className="bg-red-500 hover:bg-red-600 rounded-full px-10 h-12 font-bold shadow-md transition-all hover:scale-[1.02]"
                        >
                            Yes, Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
