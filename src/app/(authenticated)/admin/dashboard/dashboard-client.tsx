"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Plus, ChevronRight, Loader2, BookOpen, Trash2, Users, Search, X, Calendar, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CurrentUser {
  id: string;
  role: string;
  name: string;
  roll_no: string | null;
  course_id: string | null;
}

interface Subject {
  id: string;
  name: string;
  course_id: string;
  semester_number: number;
  courseName?: string;
  schoolName?: string;
}

interface Course {
  id: string;
  name: string;
  subjects: Subject[];
}

interface School {
  id: string;
  name: string;
  courses: Course[];
}

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  role: string;
  course_id: string | null;
}

interface VirtualClass {
  id: string;
  subject_id: string;
  teacher_id: string;
  academic_year: string;
  section: string | null;
  subject?: {
    id: string;
    name: string;
    course_id: string;
    semester_number?: number;
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
  _count?: {
    enrollments: number;
  };
}

export default function DashboardPageClient({ currentUser }: { currentUser: CurrentUser }) {
    const [classes, setClasses] = useState<VirtualClass[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const [hierarchy, setHierarchy] = useState<{ schools: School[] }>({ schools: [] });
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    // Form state
    const [selectedSemester, setSelectedSemester] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [classToDelete, setClassToDelete] = useState<string | null>(null);

    // Advanced Creation Logic States
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState("");
    const [showAllTeachers, setShowAllTeachers] = useState(false);

    // Filter Bar States
    const [filterTeacher, setFilterTeacher] = useState("ALL");
    const [filterSubject, setFilterSubject] = useState("ALL");
    const [searchClassQuery, setSearchClassQuery] = useState("");

    useEffect(() => {
        if (!currentUser) return;

        setDataLoading(true);
        let url = '/api/virtual-classes';
        if (currentUser.role === 'TEACHER') {
            url += `?teacher_id=${currentUser.id}`;
        } else if (currentUser.role === 'ADMIN' && currentUser.course_id) {
            url += `?course_id=${currentUser.course_id}`;
        }

        fetch(url)
            .then(res => res.json())
            .then(data => {
                setClasses(data);
                setDataLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch classes", err);
                setDataLoading(false);
            });
    }, [currentUser]);

    useEffect(() => {
        if (currentUser?.role === 'ADMIN') {
            fetch('/api/hierarchy').then(res => res.json()).then(data => setHierarchy(data));
            fetch('/api/users').then(res => res.json()).then(data => {
                setTeachers(data.filter((u: any) => u.role === 'TEACHER'));
            });
        }
    }, [currentUser]);

    // Gather all subjects from the hierarchy, filtering by Admin's course if strictly assigned
    const allSubjectsRaw = hierarchy.schools?.flatMap(school =>
        school.courses.flatMap(course =>
            course.subjects.map(subject => ({
                ...subject,
                courseName: course.name,
                schoolName: school.name
            }))
        )
    ) || [];

    const allSubjects = (currentUser?.role === 'ADMIN' && currentUser?.course_id)
        ? allSubjectsRaw.filter(sub => sub.course_id === currentUser.course_id)
        : allSubjectsRaw;

    const availableSemesters = Array.from(new Set(allSubjects.map(s => s.semester_number))).sort((a, b) => a - b);
    const filteredSubjectsForDropdown = selectedSemester && selectedSemester !== "ALL"
        ? allSubjects.filter(sub => sub.semester_number.toString() === selectedSemester.toString())
        : allSubjects;

    // Fetch sections when subject changes
    useEffect(() => {
        if (!selectedSubject) {
            setSections([]);
            setSelectedSection("");
            return;
        }
        const subject = allSubjects.find(s => s.id === selectedSubject);
        if (subject) {
            fetch(`/api/sections?course_id=${subject.course_id}&semester_number=${subject.semester_number}`)
                .then(res => res.json())
                .then(data => {
                    setSections(Array.isArray(data) ? data : []);
                })
                .catch(err => console.error("Failed to fetch sections:", err));
        }
    }, [selectedSubject, hierarchy]);

    // Derived filtering for creation dialog
    const selectedSubjectObj = allSubjects.find(s => s.id === selectedSubject);

    const eligibleTeachers = showAllTeachers ? teachers : teachers.filter(t => {
        if (!selectedSubjectObj) return true;
        return t.course_id === selectedSubjectObj.course_id;
    });

    // Dashboard Grid Filtering
    const uniqueClassTeachers = Array.from(new Set(classes.map(c => c.teacher_id)))
        .map(id => teachers.find(t => t.id === id) || classes.find(c => c.teacher_id === id)?.teacher)
        .filter(Boolean);
    const uniqueClassSubjects = Array.from(new Set(classes.map(c => c.subject_id)))
        .map(id => allSubjects.find(s => s.id === id) || classes.find(c => c.subject_id === id)?.subject)
        .filter(Boolean);

    const displayedClasses = classes.filter(c => {
        const matchTeacher = filterTeacher === "ALL" || c.teacher_id === filterTeacher;
        const matchSubject = filterSubject === "ALL" || c.subject_id === filterSubject;
        const q = searchClassQuery.toLowerCase().trim();
        const matchSearch = !q ||
            (c.subject?.name && c.subject.name.toLowerCase().includes(q)) ||
            (c.subject?.course?.name && c.subject.course.name.toLowerCase().includes(q)) ||
            (c.teacher?.name && c.teacher.name.toLowerCase().includes(q)) ||
            (c.section && c.section.toLowerCase().includes(q));
        return matchTeacher && matchSubject && matchSearch;
    });

    async function executeDeleteClass(classId: string) {
        try {
            await fetch(`/api/virtual-classes/${classId}`, { method: 'DELETE' });
            setClasses(classes.filter(c => c.id !== classId));
            setClassToDelete(null);
        } catch (err) {
            console.error("Failed to delete class:", err);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedSubject || !selectedTeacher) {
            alert("Subject and Teacher are required.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/virtual-classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: selectedSubject,
                    teacher_id: selectedTeacher,
                    academic_year: "2023-2024", // Hardcoded default to fulfill schema
                    section: selectedSection,
                    enrollments: []
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create class");
            }

            // Reload classes with strict role scoping
            let url = '/api/virtual-classes';
            if (currentUser.role === 'TEACHER') {
                url += `?teacher_id=${currentUser.id}`;
            } else if (currentUser.role === 'ADMIN' && currentUser.course_id) {
                url += `?course_id=${currentUser.course_id}`;
            }
            const updatedRes = await fetch(url);
            const updatedData = await updatedRes.json();
            setClasses(updatedData);

            setShowModal(false);
            // Reset form fields
            setSelectedSemester("");
            setSelectedSubject("");
            setSelectedTeacher("");
            setSelectedSection("");
        } catch (err: any) {
            console.error("Failed to create virtual class", err);
            alert(err.message || "Failed to create virtual class");
        } finally {
            setLoading(false);
        }
    }

    if (dataLoading) {
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-[#64748B]">Loading Dashboard...</div>;
    }

    const isAdmin = currentUser.role === 'ADMIN';

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
            <div className="relative z-0">
                <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4 pb-5 border-b border-zinc-200/80">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                            {isAdmin ? 'Administrator Dashboard' : 'Teacher Dashboard'}
                        </h1>
                        <p className="text-zinc-500 mt-1 text-xs font-medium">
                            Welcome back, {currentUser.name}
                        </p>
                    </div>

                    {isAdmin && (
                        <Dialog open={showModal} onOpenChange={setShowModal}>
                            <Button onClick={() => setShowModal(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-10 px-4 text-xs font-semibold shadow-xs inline-flex items-center gap-2">
                                <Plus size={16} /> Create Class
                            </Button>

                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 border border-zinc-200 shadow-xl bg-white">
                                <DialogHeader className="mb-4 pb-3 border-b border-zinc-100">
                                    <DialogTitle className="text-xl font-bold text-zinc-900">Create Virtual Classroom</DialogTitle>
                                    <DialogDescription className="text-zinc-500 text-xs mt-0.5">Configure subject, section, and instructor assignment.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-4">
                                        {/* Semester */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-700">Semester</label>
                                            <Select value={selectedSemester} onValueChange={(val) => {
                                                setSelectedSemester(val);
                                                setSelectedSubject("");
                                                setSelectedSection("");
                                            }}>
                                                <SelectTrigger className="w-full h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 text-zinc-800 border border-zinc-200 text-xs font-medium px-3.5 shadow-none focus:ring-1 focus:ring-zinc-900">
                                                    <SelectValue placeholder="Select semester" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg">
                                                    <SelectItem value="ALL" className="font-semibold focus:bg-zinc-100 text-xs">All Semesters</SelectItem>
                                                    {availableSemesters.map(sem => (
                                                        <SelectItem key={sem} value={sem.toString()} className="focus:bg-zinc-100 font-medium text-xs">Semester {sem}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Subject */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-700">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedSemester}>
                                                <SelectTrigger className="w-full h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 text-zinc-800 border border-zinc-200 text-xs font-medium px-3.5 shadow-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50">
                                                    <SelectValue placeholder={selectedSemester ? "Select a subject" : "Select a semester first"} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg max-h-60">
                                                    {filteredSubjectsForDropdown.map(sub => (
                                                        <SelectItem key={sub.id} value={sub.id} className="focus:bg-zinc-100 py-2 text-xs">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-zinc-900">{sub.name}</span>
                                                                <span className="text-[10px] text-zinc-400">{sub.courseName} • Sem {sub.semester_number}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Section */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-700 flex justify-between">
                                                Section
                                                {selectedSubject && sections.length === 0 && <span className="text-[11px] text-amber-600 font-medium">No active sections</span>}
                                            </label>
                                            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={sections.length === 0}>
                                                <SelectTrigger className="w-full h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 text-zinc-800 border border-zinc-200 text-xs font-medium px-3.5 shadow-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50">
                                                    <SelectValue placeholder="Select section..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg">
                                                    {sections.map(sec => (
                                                        <SelectItem key={sec} value={sec} className="focus:bg-zinc-100 font-medium text-xs">Section {sec}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Assign Teacher */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-zinc-700">Assign Teacher</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="checkbox"
                                                        id="globalTeachers"
                                                        checked={showAllTeachers}
                                                        onChange={(e) => setShowAllTeachers(e.target.checked)}
                                                        className="rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900 w-3.5 h-3.5 cursor-pointer"
                                                    />
                                                    <label htmlFor="globalTeachers" className="text-[11px] text-zinc-500 cursor-pointer font-medium">All Teachers</label>
                                                </div>
                                            </div>
                                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                                <SelectTrigger className="w-full h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 text-zinc-800 border border-zinc-200 text-xs font-medium px-3.5 shadow-none focus:ring-1 focus:ring-zinc-900">
                                                    <SelectValue placeholder="Select a teacher" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg">
                                                    {eligibleTeachers.map(t => (
                                                        <SelectItem key={t.id} value={t.id} className="focus:bg-zinc-100 font-medium text-xs">{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4 sm:justify-end gap-2 border-t border-zinc-100">
                                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl h-10 px-4 text-zinc-600 font-medium text-xs hover:bg-zinc-100">
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading} className="rounded-xl h-10 px-5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-xs transition-all">
                                            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                            {loading ? 'Creating...' : 'Create Class'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </header>

                {/* Filter Bar */}
                {classes.length > 0 && (
                    <div className="mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-2.5 rounded-xl shadow-xs border border-zinc-200/80">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                type="text"
                                placeholder="Search classrooms, courses, teachers..."
                                value={searchClassQuery}
                                onChange={(e) => setSearchClassQuery(e.target.value)}
                                className="h-9 pl-9 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-900 shadow-none w-full"
                            />
                            {searchClassQuery && (
                                <button
                                    onClick={() => setSearchClassQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="flex flex-wrap gap-2 items-center">
                                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                                    <SelectTrigger className="w-[160px] h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-none font-medium text-xs">
                                        <SelectValue placeholder="All Teachers" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-zinc-200 shadow-lg bg-white">
                                        <SelectItem value="ALL" className="font-semibold focus:bg-zinc-100 text-xs">All Teachers</SelectItem>
                                        {uniqueClassTeachers.map(t => (
                                            t ? <SelectItem key={t.id} value={t.id} className="focus:bg-zinc-100 font-medium text-xs">{t.name}</SelectItem> : null
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterSubject} onValueChange={setFilterSubject}>
                                    <SelectTrigger className="w-[180px] h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-none font-medium text-xs">
                                        <SelectValue placeholder="All Subjects" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-zinc-200 shadow-lg bg-white">
                                        <SelectItem value="ALL" className="font-semibold focus:bg-zinc-100 text-xs">All Subjects</SelectItem>
                                        {uniqueClassSubjects.map(s => (
                                            s ? <SelectItem key={s.id} value={s.id} className="focus:bg-zinc-100 font-medium text-xs">{s.name || s.id}</SelectItem> : null
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                {/* Classroom Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {isAdmin && (
                        <Card
                            onClick={() => setShowModal(true)}
                            className="bg-white border border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 aspect-[1.2] group cursor-pointer shadow-none h-full"
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-0">
                                <div className="w-10 h-10 bg-zinc-100 text-zinc-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                    <Plus size={20} strokeWidth={2} />
                                </div>
                                <CardTitle className="text-sm font-semibold text-zinc-900">Create Class</CardTitle>
                                <p className="text-[11px] text-zinc-400 font-normal mt-0.5">Add a new virtual classroom</p>
                            </CardContent>
                        </Card>
                    )}

                    {displayedClasses.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-zinc-200/80 shadow-xs">
                            <BookOpen className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 font-medium text-xs mb-2">
                                {classes.length === 0
                                    ? (isAdmin ? "No classrooms created yet" : "No classrooms have been assigned to you yet.")
                                    : "No classrooms match your search or filter criteria."}
                            </p>
                            {classes.length > 0 ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchClassQuery("");
                                        setFilterTeacher("ALL");
                                        setFilterSubject("ALL");
                                    }}
                                    className="rounded-lg font-medium text-xs border-zinc-200 hover:bg-zinc-50 text-zinc-700 h-8"
                                >
                                    Reset Filters
                                </Button>
                            ) : isAdmin && (
                                <Button variant="link" onClick={() => setShowModal(true)} className="text-zinc-900 font-semibold text-xs h-auto p-0 hover:underline">
                                    Create your first class
                                </Button>
                            )}
                        </div>
                    ) : (
                        displayedClasses.map((c) => (
                            <Link
                                href={`/class/${c.id}`}
                                key={c.id}
                                className="group block"
                            >
                                <Card className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between aspect-[1.2] shadow-xs h-full relative">
                                    
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setClassToDelete(c.id);
                                            }}
                                            className="absolute top-4 right-4 z-20 w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete Virtual Class"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-zinc-100 text-zinc-700 font-medium text-[11px] px-2 py-0.5 rounded-md border border-zinc-200/60 max-w-[150px] truncate">
                                                    {c.subject?.course?.name || 'Course'}
                                                </span>
                                                {c.subject?.semester_number && (
                                                    <span className="text-zinc-500 font-medium text-[11px] px-1.5 py-0.5">
                                                        Sem {c.subject.semester_number}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-zinc-500 font-medium flex items-center gap-1 text-xs">
                                                <Users size={12} className="text-zinc-400" />
                                                {c._count?.enrollments || 0}
                                            </span>
                                        </div>

                                        <CardTitle className="text-base font-bold text-zinc-900 leading-snug group-hover:text-zinc-700 transition-colors">
                                            {c.subject?.name || 'Unknown Subject'}
                                        </CardTitle>

                                        <div className="mt-2 text-xs text-zinc-500 flex flex-col gap-0.5">
                                            {isAdmin && (
                                                <span>Teacher: {c.teacher?.name || 'Unassigned'}</span>
                                            )}
                                            <span>Section {c.section || 'N/A'} • {c.academic_year}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-auto border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-900">
                                        <span>Enter Classroom</span>
                                        <ChevronRight size={14} className="text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <Dialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
                    <DialogContent className="sm:max-w-md rounded-2xl p-6 text-center border border-zinc-200 shadow-xl bg-white">
                        <DialogHeader>
                            <div className="mx-auto w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3">
                                <Trash2 size={18} />
                            </div>
                            <DialogTitle className="text-lg font-bold text-zinc-900">Delete Classroom?</DialogTitle>
                            <DialogDescription className="pt-1.5 text-zinc-500 text-xs font-normal pb-2">
                                This will permanently delete the virtual classroom and all recorded evaluations. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex sm:justify-center gap-2 pt-3 border-t border-zinc-100">
                            <Button type="button" variant="ghost" className="rounded-xl px-4 h-9 text-xs font-medium hover:bg-zinc-100" onClick={() => setClassToDelete(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => classToDelete && executeDeleteClass(classToDelete)}
                                className="bg-rose-600 hover:bg-rose-700 rounded-xl px-4 h-9 text-xs font-medium text-white shadow-xs"
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
