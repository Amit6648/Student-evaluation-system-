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
        <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
            <Link href="/" className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
                <ChevronLeft size={16} className="mr-1" /> Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-200/80">
                <div>
                    <span className="bg-zinc-100 text-zinc-700 border border-zinc-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-md mb-2 inline-block">
                        {classroom.subject?.course?.school?.name || 'School'} • {classroom.subject?.course?.name || 'Course'}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">{classroom.subject?.name}</h1>
                    <p className="text-zinc-500 mt-1 text-xs font-normal flex items-center gap-3">
                        <span>Teacher: {classroom.teacher?.name}</span>
                        <span className="text-zinc-300">•</span>
                        <span>Section {classroom.section || 'N/A'} • {classroom.academic_year}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Picker */}
                    <div className="flex items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[200px] justify-start text-left font-medium rounded-xl border border-zinc-200 text-xs h-9 bg-white hover:bg-zinc-50 transition-colors shadow-none",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                                    {selectedDate ? <span className="font-semibold text-zinc-800">{format(selectedDate, "MMM d, yyyy")}</span> : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border border-zinc-200 shadow-xl bg-white" align="end">
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

                    {/* Group A / Group B Segmented Control */}
                    <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
                        <button
                            onClick={() => setActiveGroup('A')}
                            className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all ${activeGroup === 'A' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Group A
                        </button>
                        <button
                            onClick={() => setActiveGroup('B')}
                            className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all ${activeGroup === 'B' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            Group B
                        </button>
                    </div>

                    {isAdmin && (
                        <Button onClick={() => setShowEnrollModal(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl flex items-center gap-1.5 font-medium px-3.5 h-9 text-xs shadow-xs">
                            <UserPlus size={14} />
                            Enroll Students
                        </Button>
                    )}
                </div>
            </header>

            {/* Compact Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-lg bg-zinc-50 text-zinc-600 flex items-center justify-center shrink-0 border border-zinc-100">
                        <Users size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Group {activeGroup} Enrolled</p>
                        <p className="text-xl font-bold text-zinc-900 leading-tight">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-lg bg-zinc-50 text-zinc-600 flex items-center justify-center shrink-0 border border-zinc-100">
                        <BarChart size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Group {activeGroup} Avg</p>
                        <p className="text-xl font-bold text-zinc-900 leading-tight">{stats.classAvg}</p>
                    </div>
                </div>
                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-lg bg-zinc-50 text-zinc-600 flex items-center justify-center shrink-0 border border-zinc-100">
                        <CheckCircle2 size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Group {activeGroup} Top Score</p>
                        <p className="text-xl font-bold text-zinc-900 leading-tight">{stats.topScore}</p>
                    </div>
                </div>
            </div>

            {/* Main Table / Heatmap Container */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs flex flex-col mb-10 overflow-hidden">
                {/* Tabs & Search Header */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-zinc-100 px-5 bg-zinc-50/50 gap-3">
                    <div className="flex shrink-0 overflow-x-auto gap-6">
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`py-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'roster' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
                        >
                            <Users size={14} />
                            Student Roster
                        </button>
                        <button
                            onClick={() => setActiveTab('gradebook')}
                            className={`py-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'gradebook' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
                        >
                            <BookOpen size={14} />
                            Gradebook
                        </button>
                        <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`py-3 text-xs font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'heatmap' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
                        >
                            <BarChart size={14} />
                            Performance Heatmap
                        </button>
                    </div>

                    <div className="flex items-center gap-2.5 py-2">
                        {/* Live Search Input */}
                        <div className="relative flex-1 sm:w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                            <Input
                                type="text"
                                placeholder="Search student..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8.5 pl-8 pr-7 bg-white border border-zinc-200 rounded-lg text-xs font-medium placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-900 shadow-none w-full"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Excel Export Button */}
                        {activeTab !== 'heatmap' && (
                            <Button onClick={() => setShowExportModal(true)} variant="outline" className="h-8.5 rounded-lg font-medium shadow-none flex items-center gap-1.5 text-zinc-700 border-zinc-200 hover:bg-zinc-50 shrink-0 text-xs">
                                <Download size={13} /> Export
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 flex-1 flex flex-col">
                    {displayedStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <Users size={24} className="text-zinc-300 mb-2" />
                            <p className="text-zinc-500 font-medium text-xs mb-2">
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
                                    className="rounded-lg font-medium text-xs h-7 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    ) : activeTab === 'heatmap' ? (
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                {displayedStudents.map((s) => {
                                    let colorClass = "bg-zinc-50 text-zinc-700 border-zinc-200/80"; // No Marks

                                    if (s.averageMarks !== null && s.averageMarks !== undefined) {
                                        if (s.averageMarks >= 32) colorClass = "bg-emerald-50/70 text-emerald-950 border-emerald-200/80 hover:border-emerald-300";
                                        else if (s.averageMarks >= 24) colorClass = "bg-sky-50/70 text-sky-950 border-sky-200/80 hover:border-sky-300";
                                        else if (s.averageMarks >= 16) colorClass = "bg-amber-50/70 text-amber-950 border-amber-200/80 hover:border-amber-300";
                                        else colorClass = "bg-rose-50/70 text-rose-950 border-rose-200/80 hover:border-rose-300";
                                    }

                                    const evalCount = s.evaluations?.length || 0;
                                    const trend = getPerformanceTrend(s.evaluations);

                                    return (
                                        <div
                                            key={s.student_id}
                                            onClick={() => setEvalHistoryStudent(s)}
                                            className={`p-4 rounded-2xl border ${colorClass} flex flex-col justify-between aspect-square transition-all duration-200 hover:shadow-md cursor-pointer`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(s.name)} shadow-none`}>
                                                    {getInitials(s.name)}
                                                </div>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[11px] font-semibold text-zinc-600 bg-white/90 px-1.5 py-0.5 rounded font-mono border border-black/5">{s.roll_no}</span>
                                                    <div className="flex items-center gap-1 text-[9px] font-medium text-zinc-500 bg-white/60 px-1 py-0.5 rounded">
                                                        <span>{evalCount} {evalCount === 1 ? 'eval' : 'evals'}</span>
                                                        {trend && trend.direction === 'up' && (
                                                            <span title={`Recent eval increased by +${trend.diff}`}>
                                                                <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                                                            </span>
                                                        )}
                                                        {trend && trend.direction === 'down' && (
                                                            <span title={`Recent eval decreased by -${trend.diff}`}>
                                                                <TrendingDown className="w-2.5 h-2.5 text-rose-600" />
                                                            </span>
                                                        )}
                                                        {trend && trend.direction === 'same' && (
                                                            <span title="Performance steady">
                                                                <Minus className="w-2.5 h-2.5 text-zinc-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="my-1">
                                                <h3 className="font-semibold leading-snug line-clamp-2 text-zinc-900 text-xs">{s.name}</h3>
                                            </div>
                                            <div className="flex justify-between items-end pt-1.5 border-t border-black/5">
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xl font-bold leading-none text-zinc-900">{getGrade(s.averageMarks)}</span>
                                                    <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 mt-0.5">Grade</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xl font-bold leading-none text-zinc-900">{s.averageMarks !== null ? s.averageMarks : '--'}</span>
                                                    <span className="text-[8px] uppercase tracking-wider font-semibold text-zinc-400 mt-0.5">Avg Score</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Minimal Filter Legend */}
                            <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-600 items-center justify-center bg-zinc-50 py-2.5 px-4 rounded-xl border border-zinc-200/80">
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mr-1 flex items-center gap-1">
                                    <Filter size={11} /> Filter:
                                </span>
                                
                                <button
                                    onClick={() => setSelectedGradeFilter('ALL')}
                                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                                        selectedGradeFilter === 'ALL'
                                            ? 'bg-zinc-900 text-white shadow-xs'
                                            : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                                    }`}
                                >
                                    All ({groupStudents.length})
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'A' ? 'ALL' : 'A')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                                        selectedGradeFilter === 'A'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-emerald-50 text-zinc-700 border border-zinc-200'
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Grade A (&ge;32)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'B' ? 'ALL' : 'B')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                                        selectedGradeFilter === 'B'
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-sky-50 text-zinc-700 border border-zinc-200'
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                    Grade B (24-31)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'C' ? 'ALL' : 'C')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                                        selectedGradeFilter === 'C'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-amber-50 text-zinc-700 border border-zinc-200'
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    Grade C (16-23)
                                </button>

                                <button
                                    onClick={() => setSelectedGradeFilter(selectedGradeFilter === 'D' ? 'ALL' : 'D')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                                        selectedGradeFilter === 'D'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-rose-50 text-zinc-700 border border-zinc-200'
                                    }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    Grade D (&lt;16)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white">
                            <Table className="w-full text-left">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/80 border-b border-zinc-100 hover:bg-zinc-50/80">
                                        <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Roll No</TableHead>
                                        <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Student Name</TableHead>
                                        {activeTab === 'roster' ? (
                                            <>
                                                {isAdmin && <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-right">Action</TableHead>}
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center">Status</TableHead>
                                                <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center">Daily Score</TableHead>
                                                {!isAdmin && <TableHead className="py-3 px-6 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-right">Evaluate</TableHead>}
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedStudents.map((s) => (
                                        <TableRow key={s.student_id} className="hover:bg-zinc-50/50 transition-colors border-b border-zinc-100 group">
                                            <TableCell className="py-3 px-6 text-zinc-500 font-mono font-medium text-xs">{s.roll_no}</TableCell>
                                            <TableCell className="py-3 px-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px] shrink-0 ${getAvatarColor(s.name)}`}>
                                                        {getInitials(s.name)}
                                                    </div>
                                                    <span className="font-medium text-xs text-zinc-900">{s.name}</span>
                                                </div>
                                            </TableCell>
                                            {activeTab === 'roster' ? (
                                                <>
                                                    {isAdmin && (
                                                        <TableCell className="py-3 px-6 text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setEnrollmentToDelete(s.enrollment_id)} className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg w-7 h-7" title="Remove Student">
                                                                <Trash2 size={14} />
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
                                                                <TableCell className="py-3 px-6 text-center font-medium text-zinc-500">
                                                                    {evForDate ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-medium border border-emerald-200/60">
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Graded
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-zinc-400 text-xs font-normal">Pending</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-3 px-6 text-center">
                                                                    <span className="font-bold text-base text-zinc-900">{dateTotal !== null ? dateTotal : '--'}</span>
                                                                </TableCell>
                                                                {!isAdmin && (
                                                                    <TableCell className="py-3 px-6 text-right">
                                                                        {isInvalidDate ? (
                                                                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2 py-1 rounded-md inline-flex items-center gap-1">
                                                                                <CalendarIcon size={11}/> {isFutureDate() ? 'Future Locked' : 'Weekend Locked'}
                                                                            </span>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => { setEvalStudent(s); setShowEvalModal(true); }}
                                                                                className={evForDate 
                                                                                    ? "text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg font-medium text-xs h-7 px-2.5 shadow-none inline-flex items-center gap-1" 
                                                                                    : "text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium text-xs h-7 px-2.5 shadow-xs inline-flex items-center gap-1"}
                                                                            >
                                                                                <Plus size={13} /> {evForDate ? 'Edit' : 'Add Eval'}
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

            {/* Evaluation Entry Modal */}
            <Dialog open={showEvalModal} onOpenChange={(open) => { if (!open) { setShowEvalModal(false); setEvalStudent(null); } }}>
                <DialogContent className="sm:max-w-sm rounded-2xl p-6 border border-zinc-200 shadow-xl bg-white">
                    <DialogHeader className="mb-2 pb-3 border-b border-zinc-100">
                        <DialogTitle className="text-lg font-bold text-zinc-900">Score Evaluation</DialogTitle>
                    </DialogHeader>

                    {evalStudent && (
                        <div className="mb-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(evalStudent.name)}`}>
                                {getInitials(evalStudent.name)}
                            </div>
                            <div>
                                <p className="font-semibold text-xs text-zinc-900 line-clamp-1">{evalStudent.name}</p>
                                <span className="text-[10px] text-zinc-400 font-mono">{evalStudent.roll_no}</span>
                            </div>
                        </div>
                    )}

                    <form key={(evalStudent?.student_id || '') + format(selectedDate, 'yyyy-MM-dd')} onSubmit={handleAddEval} className="space-y-4 pt-1">
                        {(() => {
                            const currentEval = evalStudent ? getEvalForDate(evalStudent.evaluations) : null;
                            return (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-700">Evaluation Title</label>
                                        <Input required name="eval_name" defaultValue={currentEval?.eval_name || ''} placeholder={`e.g. Daily Evaluation - ${format(selectedDate, 'MMM d')}`} className="h-9 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-medium px-3 focus-visible:ring-1 focus-visible:ring-zinc-900" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider line-clamp-1">Fundamental</label>
                                            <Input required name="fundamental_knowledge" defaultValue={currentEval?.fundamental_knowledge ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-10 text-base font-bold bg-zinc-50 border border-zinc-200 rounded-lg text-center focus-visible:ring-1 focus-visible:ring-zinc-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider line-clamp-1">Core Skills</label>
                                            <Input required name="core_skills" defaultValue={currentEval?.core_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-10 text-base font-bold bg-zinc-50 border border-zinc-200 rounded-lg text-center focus-visible:ring-1 focus-visible:ring-zinc-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider line-clamp-1">Communication</label>
                                            <Input required name="communication_skills" defaultValue={currentEval?.communication_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-10 text-base font-bold bg-zinc-50 border border-zinc-200 rounded-lg text-center focus-visible:ring-1 focus-visible:ring-zinc-900" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider line-clamp-1">Soft Skills</label>
                                            <Input required name="soft_skills" defaultValue={currentEval?.soft_skills ?? ''} type="number" step="0.5" max="10" min="0" placeholder="0-10" className="h-10 text-base font-bold bg-zinc-50 border border-zinc-200 rounded-lg text-center focus-visible:ring-1 focus-visible:ring-zinc-900" />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <DialogFooter className="pt-3 sm:justify-end gap-2 border-t border-zinc-100">
                            <Button type="button" variant="ghost" onClick={() => { setShowEvalModal(false); setEvalStudent(null); }} className="rounded-lg h-9 px-3.5 text-zinc-600 font-medium text-xs hover:bg-zinc-100">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="rounded-lg h-9 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-xs">
                                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                {loading ? 'Saving...' : 'Save Evaluation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Excel Export Configuration Modal */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 border border-zinc-200 shadow-xl bg-white">
                    <DialogHeader className="mb-3 pb-2 border-b border-zinc-100">
                        <DialogTitle className="text-lg font-bold text-zinc-900">Export to Excel</DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs">Generate .XLSX spreadsheet data</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-700">Export Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`border p-3 rounded-xl cursor-pointer transition-all ${exportMode === 'all' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <input type="radio" value="all" checked={exportMode === 'all'} onChange={() => setExportMode('all')} className="accent-zinc-900" />
                                        <span className="font-semibold text-zinc-900 text-xs">Full Matrix</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 ml-5">All evaluations parsed.</p>
                                </label>
                                <label className={`border p-3 rounded-xl cursor-pointer transition-all ${exportMode === 'average' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <input type="radio" value="average" checked={exportMode === 'average'} onChange={() => setExportMode('average')} className="accent-zinc-900" />
                                        <span className="font-semibold text-zinc-900 text-xs">Top-N Average</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 ml-5">Averages top scores.</p>
                                </label>
                            </div>
                        </div>

                        {exportMode === 'average' && (
                            <div className="space-y-1.5 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase block">Number of top evaluations</label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    value={exportTopN} 
                                    onChange={(e) => setExportTopN(parseInt(e.target.value) || 1)} 
                                    className="h-9 rounded-lg bg-white border-zinc-200 text-center font-bold text-sm focus-visible:ring-1 focus-visible:ring-zinc-900"
                                />
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="mt-5 pt-3 border-t border-zinc-100 gap-2">
                        <Button variant="ghost" onClick={() => setShowExportModal(false)} className="rounded-lg h-9 px-3.5 font-medium text-zinc-600 hover:bg-zinc-100 text-xs">Cancel</Button>
                        <Button onClick={handleExport} className="rounded-lg h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 font-medium shadow-xs flex items-center gap-1.5 text-xs">
                            <Download size={13} /> Generate .XLSX
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Student Evaluation History Modal */}
            <Dialog open={!!evalHistoryStudent} onOpenChange={(open) => { if (!open) setEvalHistoryStudent(null) }}>
                <DialogContent className="sm:max-w-2xl rounded-2xl p-6 border border-zinc-200 shadow-xl overflow-hidden max-h-[85vh] flex flex-col bg-white">
                    {evalHistoryStudent && (
                        <>
                            <DialogHeader className="flex flex-row justify-between items-start mb-2 shrink-0 border-b border-zinc-100 pb-4">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(evalHistoryStudent.name)}`}>
                                        {getInitials(evalHistoryStudent.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <DialogTitle className="text-xl font-bold text-zinc-900">{evalHistoryStudent.name}</DialogTitle>
                                            <span className="font-mono text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">{evalHistoryStudent.roll_no}</span>
                                            {evalHistoryStudent.averageMarks !== null && (
                                                <span className="bg-zinc-100 text-zinc-800 font-semibold text-xs border border-zinc-200 px-2 py-0.5 rounded-md">
                                                    Grade {getGrade(evalHistoryStudent.averageMarks)} ({evalHistoryStudent.averageMarks} Avg)
                                                </span>
                                            )}
                                        </div>
                                        <DialogDescription className="text-zinc-400 text-xs mt-0.5">Evaluation History</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="overflow-y-auto pr-1 space-y-3 flex-1 mt-2">
                                {!evalHistoryStudent.evaluations || evalHistoryStudent.evaluations.length === 0 ? (
                                    <div className="py-10 text-center text-zinc-400 font-medium text-xs bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                        No evaluations recorded for this student yet.
                                    </div>
                                ) : (
                                    evalHistoryStudent.evaluations.map((ev, i) => {
                                        const total = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                                        return (
                                            <Card key={ev.id || i} className="border border-zinc-200/80 bg-zinc-50/50 rounded-xl shadow-none p-3.5">
                                                <CardHeader className="flex flex-row justify-between items-center pb-2 p-0 border-b border-zinc-100">
                                                    <CardTitle className="text-xs font-semibold text-zinc-900">
                                                        {ev.eval_name}
                                                    </CardTitle>
                                                    <div className="flex items-baseline gap-1 text-zinc-900 bg-white px-2.5 py-0.5 rounded-md border border-zinc-200">
                                                        <span className="font-bold text-sm text-zinc-900">{total.toFixed(1)}</span>
                                                        <span className="text-[10px] text-zinc-400">/ 40</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 pb-0 p-0">
                                                    <div className="bg-white rounded-lg p-2 border border-zinc-100">
                                                        <p className="text-[9px] font-semibold text-zinc-400 uppercase">Fundamental</p>
                                                        <p className="font-bold text-xs text-zinc-900 mt-0.5">{ev.fundamental_knowledge || 0} <span className="text-zinc-400 font-normal text-[10px]">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-2 border border-zinc-100">
                                                        <p className="text-[9px] font-semibold text-zinc-400 uppercase">Core Skills</p>
                                                        <p className="font-bold text-xs text-zinc-900 mt-0.5">{ev.core_skills || 0} <span className="text-zinc-400 font-normal text-[10px]">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-2 border border-zinc-100">
                                                        <p className="text-[9px] font-semibold text-zinc-400 uppercase">Communication</p>
                                                        <p className="font-bold text-xs text-zinc-900 mt-0.5">{ev.communication_skills || 0} <span className="text-zinc-400 font-normal text-[10px]">/ 10</span></p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-2 border border-zinc-100">
                                                        <p className="text-[9px] font-semibold text-zinc-400 uppercase">Soft Skills</p>
                                                        <p className="font-bold text-xs text-zinc-900 mt-0.5">{ev.soft_skills || 0} <span className="text-zinc-400 font-normal text-[10px]">/ 10</span></p>
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

            {/* Batch Enrollment Modal */}
            <Dialog open={showEnrollModal} onOpenChange={(open) => {
                setShowEnrollModal(open);
                if (!open) setSelectedStudentIds([]);
            }}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-6 md:p-8 border border-zinc-200 shadow-xl bg-white">
                    <DialogHeader className="border-b border-zinc-100 pb-3">
                        <DialogTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                            <Users size={20} className="text-zinc-700" />
                            Batch Enroll Students
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs">
                            Manage student roster for Section {classroom?.section}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEnrollSubmit} className="space-y-4 mt-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">1. Target Enrollment Group</label>
                            <div className="flex bg-zinc-100 p-1 rounded-xl w-full border border-zinc-200/60">
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('A')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${batchGroup === 'A' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    Group A
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchGroup('B')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${batchGroup === 'B' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    Group B
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex justify-between">
                                2. Select Students
                                <span className="text-[10px] text-zinc-400 font-normal">{eligibleStudents.length} available</span>
                            </label>
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 max-h-[260px] overflow-y-auto">
                                {eligibleStudents.length === 0 ? (
                                    <p className="text-zinc-400 text-xs text-center py-4 italic">No eligible students found in the system for this course and semester.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {eligibleStudents.map((student) => {
                                            const existingEnrollment = students.find(s => s.student_id === student.id);
                                            const isAssigned = !!existingEnrollment;

                                            return (
                                                <div key={student.id} className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${isAssigned ? 'bg-zinc-100/80 border-zinc-200' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            className="w-3.5 h-3.5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900 cursor-pointer"
                                                            checked={selectedStudentIds.includes(student.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                                                                else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-xs text-zinc-900">{student.name}</p>
                                                            <p className="text-[10px] text-zinc-400 font-mono">{student.roll_no}</p>
                                                        </div>
                                                    </div>
                                                    {isAssigned && (
                                                        <span className="bg-zinc-200 text-zinc-700 text-[10px] font-medium px-2 py-0.5 rounded">
                                                            Group {existingEnrollment.group_label}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:justify-end pt-4 border-t border-zinc-100">
                            <Button type="button" variant="ghost" className="rounded-lg h-9 px-3.5 text-zinc-600 font-medium text-xs hover:bg-zinc-100" onClick={() => setShowEnrollModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || selectedStudentIds.length === 0} className="rounded-lg h-9 px-4 bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 shadow-xs">
                                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                                Save {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''} Enrollments
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Remove Student Confirmation Modal */}
            <Dialog open={!!enrollmentToDelete} onOpenChange={(open) => !open && setEnrollmentToDelete(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 text-center border border-zinc-200 shadow-xl bg-white">
                    <DialogHeader>
                        <div className="mx-auto w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3">
                            <Trash2 size={18} />
                        </div>
                        <DialogTitle className="text-lg font-bold text-zinc-900">Remove Student?</DialogTitle>
                        <DialogDescription className="pt-1 text-zinc-500 text-xs font-normal pb-3">
                            Are you sure you want to remove this student from the classroom? <br />
                            <span className="text-rose-600 font-medium">All recorded marks for this student will be lost.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-center gap-2 border-t border-zinc-100 pt-4">
                        <Button type="button" variant="ghost" className="rounded-lg px-4 h-9 font-medium text-zinc-600 text-xs hover:bg-zinc-100" onClick={() => setEnrollmentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => enrollmentToDelete && executeRemoveStudent(enrollmentToDelete)}
                            className="bg-rose-600 hover:bg-rose-700 rounded-lg px-4 h-9 font-medium text-white text-xs shadow-xs"
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
