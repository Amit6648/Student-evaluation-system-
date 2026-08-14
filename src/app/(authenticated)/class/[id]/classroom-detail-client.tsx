"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus, Users, BookOpen, Trash2, CheckCircle2, BarChart, Loader2, UserPlus, Calendar as CalendarIcon, Download, Search, X, TrendingUp, TrendingDown, Minus, Filter } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper to generate initials
function getInitials(name: string) {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Helper to get grade according to average marks (out of 40)
function getGrade(score: number | null | undefined): string {
    if (score === null || score === undefined || isNaN(score)) return "--";
    if (score >= 32) return "A";
    if (score >= 24) return "B";
    if (score >= 16) return "C";
    return "D";
}

// Helper to calculate student performance trajectory (latest vs previous eval)
function getPerformanceTrend(evaluations: Evaluation[]) {
    if (!evaluations || evaluations.length < 2) return null;
    const sorted = [...evaluations].sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime());
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const latestTotal = (latest.fundamental_knowledge || 0) + (latest.core_skills || 0) + (latest.communication_skills || 0) + (latest.soft_skills || 0);
    const prevTotal = (prev.fundamental_knowledge || 0) + (prev.core_skills || 0) + (prev.communication_skills || 0) + (prev.soft_skills || 0);
    const diff = latestTotal - prevTotal;
    if (diff > 0) return { direction: 'up' as const, diff: diff.toFixed(1) };
    if (diff < 0) return { direction: 'down' as const, diff: Math.abs(diff).toFixed(1) };
    return { direction: 'same' as const, diff: '0' };
}

// Helper to get a consistent color based on name string
function getAvatarColor(name: string) {
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

interface CurrentUser {
  id: string;
  role: string;
  name: string;
  roll_no: string | null;
  course_id: string | null;
}

interface Evaluation {
  id: string;
  enrollment_id: string;
  eval_name: string;
  fundamental_knowledge: number | null;
  core_skills: number | null;
  communication_skills: number | null;
  soft_skills: number | null;
  evaluation_date: string;
  remarks: string | null;
}

interface Student {
  enrollment_id: string;
  student_id: string;
  name: string;
  roll_no: string | null;
  group_label: string;
  averageMarks: number | null;
  evaluations: Evaluation[];
}

interface Classroom {
  id: string;
  academic_year: string;
  section: string | null;
  subject?: {
    id: string;
    name: string;
    course?: {
      id: string;
      name: string;
      school?: {
        id: string;
        name: string;
      }
    }
  };
  teacher?: {
    id: string;
    name: string;
  };
}

export default function ClassroomDetailPageClient({ currentUser, classId }: { currentUser: CurrentUser; classId: string }) {
    const router = useRouter();

    // Server state
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [stats, setStats] = useState({ totalStudents: 0, classAvg: '--', topScore: '--' });
    const [dataLoading, setDataLoading] = useState(true);

    // Filter state
    const [activeGroup, setActiveGroup] = useState('A');
    const [activeTab, setActiveTab] = useState("roster");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
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

    const getEvalForDate = (studentEvals: Evaluation[]) => {
        if (!studentEvals) return null;
        const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
        return studentEvals.find(ev => {
            if (!ev.evaluation_date) return false;
            // Native string-slice isolates identical Date strings bypassing all local browser UTC cast anomalies
            return ev.evaluation_date.split('T')[0] === targetDateStr;
        });
    };

    // UI state
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [evalStudent, setEvalStudent] = useState<Student | null>(null);
    const [evalHistoryStudent, setEvalHistoryStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);

    // Eligible students state
    const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
    const [batchGroup, setBatchGroup] = useState('A');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('all'); // 'all' or 'average'
    const [exportTopN, setExportTopN] = useState(3);

    const handleExport = () => {
        let exportData: any[] = [];
        // Export the entirety of the classroom un-filtered by the current UI Tab
        const displayed = students;

        if (exportMode === 'all') {
            // Collect all unique dates across all students to form columns
            const allDates = new Set<string>();
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
                const row: any = {
                    "Roll No": s.roll_no,
                    "Student Name": s.name,
                    "Group": s.group_label,
                };
                
                // Fill individual marks for every logged date
                dateColumns.forEach(dateLabel => {
                   const ev = s.evaluations?.find(e => format(new Date(e.evaluation_date), 'MMM d, yyyy') === dateLabel);
                   if(ev) {
                       row[dateLabel] = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                   } else {
                       row[dateLabel] = "-";
                   }
                });
                row["Grade"] = getGrade(s.averageMarks);
                row["Overall Average"] = s.averageMarks !== null ? s.averageMarks : "-";
                return row;
            });

        } else if (exportMode === 'average') {
            exportData = displayed.map(s => {
                const row: any = {
                    "Roll No": s.roll_no,
                    "Student Name": s.name,
                    "Group": s.group_label,
                };
                
                if(!s.evaluations || s.evaluations.length === 0) {
                    row["Grade"] = "-";
                    row[`Top ${exportTopN} Average`] = "-";
                    return row;
                }

                // Parse topological arrays mathematically sorting values
                const totals = s.evaluations.map(ev => (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0));
                totals.sort((a,b) => b - a); // descending
                const topScores = totals.slice(0, exportTopN);
                const sum = topScores.reduce((acc, val) => acc + val, 0);
                const avgNum = topScores.length > 0 ? (sum / topScores.length) : null;
                const avg = avgNum !== null ? avgNum.toFixed(2) : "-";
                
                row["Grade"] = avgNum !== null ? getGrade(avgNum) : "-";
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
            const res = await fetch(`/api/virtual-classes/${classId}`);
            if (res.ok) {
                const data = await res.json();
                setClassroom(data.virtualClass);

                const mappedEnrollments = data.virtualClass.enrollments.map((e: any) => ({
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
            const res = await fetch(`/api/eligible-students/${classId}`);
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
    }, [classId]);

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

    async function handleAddEval(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!evalStudent) return;
        
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        
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

    async function executeRemoveStudent(enrollmentId: string) {
        try {
            await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
            await fetchClassroomData();
            setEnrollmentToDelete(null);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleEnrollSubmit(e: React.FormEvent) {
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
                    virtual_class_id: classId,
                    group_label: batchGroup,
                    student_ids: selectedStudentIds
                })
            });
            await fetchClassroomData();
            await fetchEligibleStudents(); // Refresh lists
            setShowEnrollModal(false);
            setSelectedStudentIds([]); // Clear selection
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
    const groupStudents = students.filter(s => s.group_label === activeGroup);
    const displayedStudents = groupStudents.filter(s => {
        const matchesSearch = !searchQuery.trim() ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.roll_no && s.roll_no.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesGrade = activeTab !== 'heatmap' || selectedGradeFilter === 'ALL' || getGrade(s.averageMarks) === selectedGradeFilter;
        return matchesSearch && matchesGrade;
    });

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto relative pl-12 border-l-[4px] border-emerald-600 shadow-[inset_1px_0_0_rgba(0,0,0,0.03)]">
            <Link href="/" className="inline-flex items-center text-slate-600 hover:text-emerald-700 mb-8 font-bold transition-colors">
                <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sticky top-0 z-50 pt-2 pb-4 backdrop-blur-xl bg-[#F4F7F6]/80 border-b border-slate-200/70">
                <div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded-lg mb-3 inline-block">
                        {classroom.subject?.course?.school?.name || 'School'} • {classroom.subject?.course?.name || 'Course'}
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11221F] leading-tight tracking-tight">{classroom.subject?.name}</h1>
                    <p className="text-slate-600 mt-2 font-semibold text-base flex items-center gap-3">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-600 block"></span> Teacher: {classroom.teacher?.name}</span>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-2 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-400 block"></span> Year: {classroom.academic_year}</span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4 mt-4 md:mt-0">
                    <div className="flex flex-col items-start gap-1.5 focus-within:ring-2 rounded-full focus-within:ring-emerald-500/20 transition-all">
                        <label className="text-[10px] font-black tracking-widest uppercase text-slate-400 ml-2">Evaluation Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal rounded-full border border-slate-200 shadow-xs h-11 bg-white hover:bg-slate-50 transition-colors focus-visible:ring-0",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-4 w-4 text-emerald-600" />
                                    {selectedDate ? <span className="font-bold text-slate-800">{format(selectedDate, "PPP")}</span> : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-3xl border border-slate-100 shadow-2xl bg-white" align="end">
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
                    <div className="flex bg-slate-200/60 p-1.5 rounded-full w-full md:w-auto shadow-xs border border-slate-200/50">
                        <button
                            onClick={() => setActiveGroup('A')}
                            className={`flex-1 md:w-32 py-2.5 rounded-full text-sm font-bold transition-all ${activeGroup === 'A' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Group A
                        </button>
                        <button
                            onClick={() => setActiveGroup('B')}
                            className={`flex-1 md:w-32 py-2.5 rounded-full text-sm font-bold transition-all ${activeGroup === 'B' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Group B
                        </button>
                    </div>
                </div>

                {isAdmin && (
                    <Button onClick={() => setShowEnrollModal(true)} className="mt-4 md:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 rounded-full flex items-center gap-2 font-bold px-6 h-12 transition-all hover:scale-[1.02]">
                        <UserPlus className="w-5 h-5" />
                        Enroll Students
                    </Button>
                )}
            </header>

            {/* Compact Stat Cards for Active Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group {activeGroup} Enrolled</p>
                        <p className="text-2xl font-black text-[#11221F] leading-tight">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                        <BarChart size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group {activeGroup} Avg</p>
                        <p className="text-2xl font-black text-[#11221F] leading-tight">{stats.classAvg}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center gap-4 px-5 py-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group {activeGroup} Top</p>
                        <p className="text-2xl font-black text-[#11221F] leading-tight">{stats.topScore}</p>
                    </div>
                </div>
            </div >

            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-col mb-12 overflow-hidden">
                {/* Tabs & Search Header */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200/70 px-6 py-3 bg-slate-50/70 gap-4">
                    <div className="flex shrink-0 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`px-5 py-3 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'roster' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Users size={18} className={activeTab === 'roster' ? 'text-emerald-600' : ''} />
                            Student Roster
                        </button>
                        <button
                            onClick={() => setActiveTab('gradebook')}
                            className={`px-5 py-3 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'gradebook' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <BookOpen size={18} className={activeTab === 'gradebook' ? 'text-emerald-600' : ''} />
                            Gradebook
                        </button>
                        <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`px-5 py-3 font-bold text-sm tracking-wide flex items-center gap-2 border-b-[3px] transition-all ${activeTab === 'heatmap' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <BarChart size={18} className={activeTab === 'heatmap' ? 'text-emerald-600' : ''} />
                            Performance Heatmap
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Search Input */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search by name or roll..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-full text-xs font-semibold placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-none w-full"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Excel Export Button Integration */}
                        {activeTab !== 'heatmap' && (
                            <Button onClick={() => setShowExportModal(true)} variant="outline" className="h-9 rounded-full font-bold shadow-xs flex items-center gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 shrink-0 text-xs">
                                <Download size={14} /> Export
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 flex-1 flex flex-col">
                    {displayedStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <Users size={24} className="text-[#111827]/30" />
                            </div>
                            <p className="text-[#111827]/80 font-bold mb-2">
                                {searchQuery || (activeTab === 'heatmap' && selectedGradeFilter !== 'ALL')
                                    ? "No students match your search or filter criteria."
                                    : `No students enrolled in Group ${activeGroup} yet.`}
                            </p>
                            {(searchQuery || (activeTab === 'heatmap' && selectedGradeFilter !== 'ALL')) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedGradeFilter("ALL");
                                    }}
                                    className="rounded-full font-bold mt-2 text-xs"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    ) : activeTab === 'heatmap' ? (
                        <div className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {displayedStudents.map((s) => {
                                    let colorClass = "bg-slate-50 text-slate-700 border-slate-200/80"; // No Marks

                                    if (s.averageMarks !== null && s.averageMarks !== undefined) {
                                        if (s.averageMarks >= 32) colorClass = "bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-400";
                                        else if (s.averageMarks >= 24) colorClass = "bg-teal-50 text-teal-950 border-teal-200 hover:border-teal-400";
                                        else if (s.averageMarks >= 16) colorClass = "bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400";
                                        else colorClass = "bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-400";
                                    }

                                    const evalCount = s.evaluations?.length || 0;
                                    const trend = getPerformanceTrend(s.evaluations);

                                    return (
                                        <div
                                            key={s.student_id}
                                            onClick={() => setEvalHistoryStudent(s)}
                                            className={`p-5 rounded-3xl border ${colorClass} flex flex-col justify-between aspect-square transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 shadow-xs hover:shadow-xl cursor-pointer`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(s.name)} shadow-xs`}>
                                                    {getInitials(s.name)}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-bold opacity-80 bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-xs font-mono">{s.roll_no}</span>
                                                    <div className="flex items-center gap-1 text-[9px] font-bold opacity-70 bg-white/60 px-1.5 py-0.5 rounded">
                                                        <span>{evalCount} {evalCount === 1 ? 'eval' : 'evals'}</span>
                                                        {trend && trend.direction === 'up' && (
                                                            <span title={`Recent eval increased by +${trend.diff}`}>
                                                                <TrendingUp className="w-3 h-3 text-emerald-700" />
                                                            </span>
                                                        )}
                                                        {trend && trend.direction === 'down' && (
                                                            <span title={`Recent eval decreased by -${trend.diff}`}>
                                                                <TrendingDown className="w-3 h-3 text-rose-700" />
                                                            </span>
                                                        )}
                                                        {trend && trend.direction === 'same' && (
                                                            <span title="Performance steady">
                                                                <Minus className="w-3 h-3 text-slate-600" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <h3 className="font-bold leading-tight line-clamp-2 text-[#11221F] text-[15px]">{s.name}</h3>
                                            </div>
                                            <div className="flex justify-between items-end mt-2 pt-2 border-t border-black/5">
                                                <div className="flex flex-col items-start text-[#11221F]">
                                                    <span className="text-2xl sm:text-3xl font-black leading-none">{getGrade(s.averageMarks)}</span>
                                                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-50 mt-1">Grade</span>
                                                </div>
                                                <div className="text-2xl sm:text-3xl font-black flex flex-col items-end text-[#11221F]">
                                                    <span className="leading-none">{s.averageMarks !== null ? s.averageMarks : '--'}</span>
                                                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-50 mt-1">Avg Score</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Clickable Interactive Legend Filters */}
                            <div className="mt-8 flex flex-wrap gap-2 sm:gap-3 text-xs font-bold text-slate-600 items-center justify-center bg-slate-50/80 py-3 px-6 rounded-full border border-slate-200">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mr-1 flex items-center gap-1">
                                    <Filter size={12} /> Filter:
                                </span>
                                
                                <button
                                    onClick={() => setSelectedGradeFilter('ALL')}
                                    className={`px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
                                        selectedGradeFilter === 'ALL'
                                            ? 'bg-[#11221F] text-white shadow-xs'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    All ({groupStudents.length})
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'A' ? 'ALL' : 'A')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
                                        selectedGradeFilter === 'A'
                                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedGradeFilter === 'A' ? 'bg-white' : 'bg-emerald-500'}`}></div>
                                    Grade A: &ge; 32 (High)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'B' ? 'ALL' : 'B')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
                                        selectedGradeFilter === 'B'
                                            ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/40'
                                            : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedGradeFilter === 'B' ? 'bg-white' : 'bg-teal-500'}`}></div>
                                    Grade B: 24 - 31 (Avg)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'C' ? 'ALL' : 'C')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
                                        selectedGradeFilter === 'C'
                                            ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40'
                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedGradeFilter === 'C' ? 'bg-white' : 'bg-amber-500'}`}></div>
                                    Grade C: 16 - 23 (Low)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'D' ? 'ALL' : 'D')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-xs font-bold ${
                                        selectedGradeFilter === 'D'
                                            ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/40'
                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedGradeFilter === 'D' ? 'bg-white' : 'bg-rose-500'}`}></div>
                                    Grade D: &lt; 16 (Critical)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white">
                            <Table className="w-full text-left">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200/80 hover:bg-slate-50/80">
                                        <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll No</TableHead>
                                        <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Name</TableHead>
                                        {activeTab === 'roster' ? (
                                            <>
                                                {isAdmin && <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Admin Action</TableHead>}
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</TableHead>
                                                <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Daily Score</TableHead>
                                                {!isAdmin && <TableHead className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Evaluate</TableHead>}
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedStudents.map((s) => (
                                        <TableRow key={s.student_id} className="hover:bg-emerald-50/20 transition-colors border-b border-slate-100 group">
                                            <TableCell className="py-4 px-8 text-slate-500 font-mono font-bold text-xs">{s.roll_no}</TableCell>
                                            <TableCell className="py-4 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${getAvatarColor(s.name)}`}>
                                                        {getInitials(s.name)}
                                                    </div>
                                                    <span className="font-bold text-[#11221F]">{s.name}</span>
                                                </div>
                                            </TableCell>
                                            {activeTab === 'roster' ? (
                                                <>
                                                    {isAdmin && (
                                                        <TableCell className="py-4 px-8 text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setEnrollmentToDelete(s.enrollment_id)} className="text-slate-400 hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50" title="Remove Student">
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {(() => {
                                                        const evForDate = getEvalForDate(s.evaluations);
                                                        const dateTotal = evForDate ? ((evForDate.fundamental_knowledge || 0) + (evForDate.core_skills || 0) + (evForDate.communication_skills || 0) + (evForDate.soft_skills || 0)) : null;
                                                        
                                                        return (
                                                            <>
                                                                <TableCell className="py-4 px-8 text-center font-bold text-slate-500">
                                                                    {evForDate ? <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Graded</div> : <div className="text-amber-600 text-xs font-semibold">Pending</div>}
                                                                </TableCell>
                                                                <TableCell className="py-4 px-8 text-center">
                                                                    <span className="font-black text-xl text-emerald-700">{dateTotal !== null ? dateTotal : '--'}</span>
                                                                </TableCell>
                                                                {!isAdmin && (
                                                                    <TableCell className="py-4 px-8 text-right">
                                                                        {isInvalidDate ? (
                                                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-full inline-flex items-center gap-1 border border-amber-200">
                                                                                <CalendarIcon size={12}/> {isFutureDate() ? 'Future Locked' : 'Weekend Locked'}
                                                                            </span>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => { setEvalStudent(s); setShowEvalModal(true); }}
                                                                                className={evForDate ? "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-full font-bold shadow-xs inline-flex items-center gap-1 px-4 text-xs" : "text-white bg-emerald-600 hover:bg-emerald-700 transition-all rounded-full font-bold shadow-sm shadow-emerald-600/20 inline-flex items-center gap-1 px-4 text-xs"}
                                                                            >
                                                                                <Plus size={15} /> {evForDate ? 'Edit Eval' : 'Add Eval'}
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
                <DialogContent className="sm:max-w-sm rounded-3xl p-8 border border-slate-100 shadow-2xl bg-white relative">
                    <div className="absolute top-0 left-0 bg-emerald-700 text-white px-5 py-2.5 rounded-br-2xl font-bold flex items-center gap-2 shadow-xs text-xs uppercase tracking-wider">
                        Evaluation
                    </div>
                    <DialogHeader className="mb-2 mt-6 border-b border-slate-100 pb-4">
                        <DialogTitle className="text-2xl font-extrabold text-[#11221F]">Score Evaluation</DialogTitle>
                    </DialogHeader>

                    {evalStudent && (
                        <div className="mb-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${getAvatarColor(evalStudent.name)}`}>
                                {getInitials(evalStudent.name)}
                            </div>
                            <div>
                                <p className="font-bold text-[#11221F] line-clamp-1">{evalStudent.name}</p>
                                <span className="text-xs uppercase font-bold text-slate-400 tracking-widest">{evalStudent.roll_no}</span>
                            </div>
                        </div>
                    )}

                    <form key={(evalStudent?.student_id || '') + format(selectedDate, 'yyyy-MM-dd')} onSubmit={handleAddEval} className="space-y-5 pt-2">
                        {(() => {
                            const currentEval = evalStudent ? getEvalForDate(evalStudent.evaluations) : null;
                            return (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[#11221F] uppercase tracking-wider ml-1">Evaluation Title</label>
                                        <Input required name="eval_name" defaultValue={currentEval?.eval_name || ''} placeholder={`e.g. Daily Evaluation - ${format(selectedDate, 'MMM d')}`} className="h-11 rounded-full bg-slate-50 border border-slate-200 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 font-semibold px-4 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 ml-1" title="Fundamental Knowledge">Fundamental</label>
                                            <Input required name="fundamental_knowledge" defaultValue={currentEval?.fundamental_knowledge ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-slate-50 border border-slate-200 shadow-xs rounded-2xl focus-visible:ring-2 focus-visible:ring-emerald-500 text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 ml-1" title="Core/Technical Skills">Core Skills</label>
                                            <Input required name="core_skills" defaultValue={currentEval?.core_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-slate-50 border border-slate-200 shadow-xs rounded-2xl focus-visible:ring-2 focus-visible:ring-emerald-500 text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 ml-1" title="Communication Skills">Communication</label>
                                            <Input required name="communication_skills" defaultValue={currentEval?.communication_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-slate-50 border border-slate-200 shadow-xs rounded-2xl focus-visible:ring-2 focus-visible:ring-emerald-500 text-center" />
                                        </div>
                                        <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 ml-1" title="Soft and Life Skills">Soft Skills</label>
                                            <Input required name="soft_skills" defaultValue={currentEval?.soft_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-12 text-lg font-black bg-slate-50 border border-slate-200 shadow-xs rounded-2xl focus-visible:ring-2 focus-visible:ring-emerald-500 text-center" />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <DialogFooter className="pt-6 sm:justify-end gap-3 mt-4 border-t border-slate-100">
                            <Button type="button" variant="ghost" onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="rounded-full h-11 px-6 text-slate-600 font-bold hover:bg-slate-100 shadow-xs text-xs">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-full h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all text-xs">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Saving...' : 'Save Evaluation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Excel Export Configuration Modal */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                <DialogContent className="sm:max-w-md rounded-3xl p-8 border border-slate-100 shadow-2xl bg-white">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-extrabold text-[#11221F]">Export Data to Excel</DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 mt-1 uppercase tracking-widest text-[10px]">Generate localized .XLSX spreadsheets</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[#11221F] uppercase tracking-wider">Export Format Mode</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 border p-4 rounded-2xl cursor-pointer transition-all ${exportMode === 'all' ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-400/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input type="radio" value="all" checked={exportMode === 'all'} onChange={() => setExportMode('all')} className="accent-emerald-600" />
                                        <span className="font-bold text-[#11221F] text-sm">Full Matrix</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight ml-5">Every daily evaluation individually parsed.</p>
                                </label>
                                <label className={`flex-1 border p-4 rounded-2xl cursor-pointer transition-all ${exportMode === 'average' ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-400/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input type="radio" value="average" checked={exportMode === 'average'} onChange={() => setExportMode('average')} className="accent-emerald-600" />
                                        <span className="font-bold text-[#11221F] text-sm">Top-N Average</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight ml-5">Averages specific highest scoring entries.</p>
                                </label>
                            </div>
                        </div>

                        {exportMode === 'average' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <label className="text-center text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-2">Extract Highest 'N' Outcomes</label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    value={exportTopN} 
                                    onChange={(e) => setExportTopN(parseInt(e.target.value) || 1)} 
                                    className="h-12 rounded-xl bg-white border-slate-200 shadow-xs font-black text-center text-xl focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all"
                                />
                                <p className="text-center text-[10px] font-bold text-slate-400 mt-2">Will structurally sort and average the {exportTopN || 1} highest evaluations per student.</p>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="mt-8 pt-5 border-t border-slate-100 gap-3">
                        <Button variant="ghost" onClick={() => setShowExportModal(false)} className="rounded-full h-11 px-6 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs">Cancel</Button>
                        <Button onClick={handleExport} className="rounded-full h-11 px-8 bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] text-xs">
                            <Download size={15} /> Generate .XLSX
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!evalHistoryStudent} onOpenChange={(open) => { if (!open) setEvalHistoryStudent(null) }}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-8 border border-slate-100 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col bg-white relative">
                    <div className="absolute top-0 right-0 bg-emerald-700 text-white px-5 py-2.5 rounded-bl-2xl font-bold flex items-center gap-2 shadow-xs text-xs uppercase tracking-wider">
                        History
                    </div>
                    {evalHistoryStudent && (
                        <>
                            <DialogHeader className="flex flex-row justify-between items-start mb-2 shrink-0 border-b border-slate-100 pb-6 mt-4">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-xs ${getAvatarColor(evalHistoryStudent.name)}`}>
                                        {getInitials(evalHistoryStudent.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#11221F] leading-none">{evalHistoryStudent.name}</DialogTitle>
                                            <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-600 rounded-md py-0 shadow-xs border border-slate-200">{evalHistoryStudent.roll_no}</Badge>
                                            {evalHistoryStudent.averageMarks !== null && (
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 px-2.5 py-0.5">
                                                    Grade {getGrade(evalHistoryStudent.averageMarks)} ({evalHistoryStudent.averageMarks} Avg)
                                                </Badge>
                                            )}
                                        </div>
                                        <DialogDescription className="font-bold text-slate-400 mt-1.5 uppercase tracking-widest text-[10px]">Performance History</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="overflow-y-auto pr-2 space-y-4 flex-1 mt-4">
                                {!evalHistoryStudent.evaluations || evalHistoryStudent.evaluations.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        No evaluations recorded for this student yet.
                                    </div>
                                ) : (
                                    evalHistoryStudent.evaluations.map((ev, i) => {
                                        const total = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                                        return (
                                            <Card key={ev.id || i} className="border border-slate-200/80 bg-slate-50/50 rounded-2xl shadow-xs hover:shadow-md transition-all py-2 px-1">
                                                <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-slate-100">
                                                    <CardTitle className="text-base font-extrabold text-[#11221F] flex items-center gap-3 m-0 p-0">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                                        {ev.eval_name}
                                                    </CardTitle>
                                                    <div className="flex items-baseline gap-1 text-[#11221F] bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                                                        <span className="font-extrabold text-lg text-emerald-700">{total.toFixed(1)}</span>
                                                        <span className="text-xs font-bold text-slate-400">/ 40</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 pb-2">
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fundamental</p>
                                                        <p className="font-black text-base text-[#11221F]">{ev.fundamental_knowledge || 0} <span className="text-slate-400 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Core Skills</p>
                                                        <p className="font-black text-base text-[#11221F]">{ev.core_skills || 0} <span className="text-slate-400 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Communication</p>
                                                        <p className="font-black text-base text-[#11221F]">{ev.communication_skills || 0} <span className="text-slate-400 font-bold text-xs">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Soft Skills</p>
                                                        <p className="font-black text-base text-[#11221F]">{ev.soft_skills || 0} <span className="text-slate-400 font-bold text-xs">/ 10</span></p>
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
                <DialogContent className="sm:max-w-xl rounded-3xl p-8 md:p-10 border border-slate-100 shadow-2xl bg-white relative">
                    <div className="absolute top-0 left-0 bg-emerald-700 text-white px-5 py-2.5 rounded-br-2xl font-bold flex items-center gap-2 shadow-xs text-xs uppercase tracking-wider">
                        Enrollment
                    </div>
                    <DialogHeader className="mt-6 border-b border-slate-100 pb-4">
                        <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#11221F] flex items-center gap-3">
                            <Users size={26} className="text-emerald-600" />
                            Batch Enroll
                        </DialogTitle>
                        <DialogDescription className="pt-1.5 text-slate-500 font-semibold text-xs">
                            Administer student roster for Section {classroom?.section}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEnrollSubmit} className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#11221F] uppercase tracking-widest ml-1">1. Target Enrollment Group</label>
                            <div className="flex bg-slate-100 p-1.5 rounded-full w-full shadow-xs border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('A')}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${batchGroup === 'A' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Group A
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('B')}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${batchGroup === 'B' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Group B
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#11221F] uppercase tracking-widest ml-1 flex justify-between">
                                2. Select Students
                                <span className="text-[10px] opacity-60 text-slate-500 font-bold">{eligibleStudents.length} available</span>
                            </label>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[300px] overflow-y-auto shadow-xs">
                                {eligibleStudents.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-4 italic">No eligible students found in the system for this course and semester.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {eligibleStudents.map((student) => {
                                            const existingEnrollment = students.find(s => s.student_id === student.id);
                                            const isAssigned = !!existingEnrollment;

                                            const containerClasses = isAssigned
                                                ? "bg-emerald-50/80 border-emerald-200"
                                                : "bg-white border-slate-200 hover:border-emerald-400";

                                            return (
                                                <div key={student.id} className={`flex justify-between items-center p-3 rounded-2xl shadow-xs border transition-colors ${containerClasses}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                            checked={selectedStudentIds.includes(student.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                                                                else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                            }}
                                                        />
                                                        <div>
                                                            <p className={`font-bold text-sm ${isAssigned ? 'text-emerald-900' : 'text-slate-800'}`}>{student.name}</p>
                                                            <p className={`text-xs ${isAssigned ? 'text-emerald-700' : 'text-slate-500'}`}>{student.roll_no}</p>
                                                        </div>
                                                    </div>
                                                    {isAssigned && (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold shadow-xs text-[10px]">
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

                        <DialogFooter className="gap-3 sm:justify-end pt-6 mt-4 border-t border-slate-100">
                            <Button type="button" variant="ghost" className="rounded-full h-11 px-6 text-slate-600 font-bold hover:bg-slate-100 shadow-xs text-xs" onClick={() => setShowEnrollModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || selectedStudentIds.length === 0} className="rounded-full h-11 px-8 bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''} Enrollments
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!enrollmentToDelete} onOpenChange={(open) => !open && setEnrollmentToDelete(null)}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 text-center border border-slate-100 shadow-2xl bg-white">
                    <DialogHeader>
                        <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-xs border border-rose-100">
                            <Trash2 size={24} />
                        </div>
                        <DialogTitle className="text-2xl font-extrabold text-[#11221F]">Remove Student?</DialogTitle>
                        <DialogDescription className="pt-2 text-slate-600 font-medium pb-4 text-xs">
                            Are you sure you want to remove this student from the classroom? <br /><br />
                            <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 inline-block">All recorded marks and evaluation history will be permanently lost!</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-center gap-3 border-t border-slate-100 pt-5">
                        <Button type="button" variant="ghost" className="rounded-full px-6 h-11 font-bold hover:bg-slate-50 text-slate-600 text-xs" onClick={() => setEnrollmentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => enrollmentToDelete && executeRemoveStudent(enrollmentToDelete)}
                            className="bg-rose-600 hover:bg-rose-700 rounded-full px-8 h-11 font-bold shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] text-white text-xs"
                        >
                            Yes, Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
