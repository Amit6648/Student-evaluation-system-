import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, Plus, GraduationCap, Users, ChevronRight, Loader2, UserPlus, BookOpen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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

export default function Dashboard({ currentUser }) {
    const [classes, setClasses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const [hierarchy, setHierarchy] = useState({ schools: [] });
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);

    // Form state
    const [selectedSemester, setSelectedSemester] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [classToDelete, setClassToDelete] = useState(null);

    // Advanced Creation Logic States
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState("");
    const [showAllTeachers, setShowAllTeachers] = useState(false);

    // Filter Bar States
    const [filterTeacher, setFilterTeacher] = useState("ALL");
    const [filterSubject, setFilterSubject] = useState("ALL");

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
                setTeachers(data.filter(u => u.role === 'TEACHER'));
                setStudents(data.filter(u => u.role === 'STUDENT'));
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
        .map(id => teachers.find(t => t.id === id))
        .filter(Boolean);
    const uniqueClassSubjects = Array.from(new Set(classes.map(c => c.subject_id)))
        .map(id => allSubjects.find(s => s.id === id) || classes.find(c => c.id === id)?.subject)
        .filter(Boolean);

    const displayedClasses = classes.filter(c => {
        const matchTeacher = filterTeacher === "ALL" || c.teacher_id === filterTeacher;
        const matchSubject = filterSubject === "ALL" || c.subject_id === filterSubject;
        return matchTeacher && matchSubject;
    });

    async function executeDeleteClass(classId) {
        try {
            await fetch(`/api/virtual-classes/${classId}`, { method: 'DELETE' });
            setClasses(classes.filter(c => c.id !== classId));
            setClassToDelete(null);
        } catch (err) {
            console.error("Failed to delete class:", err);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedSubject || !selectedTeacher) {
            alert("Subject and Teacher are required.");
            return;
        }

        setLoading(true);

        try {
            await fetch('/api/virtual-classes', {
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
        } catch (err) {
            console.error("Failed to create virtual class", err);
        } finally {
            setLoading(false);
        }
    }

    if (dataLoading) {
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-[#64748B]">Loading Dashboard...</div>;
    }

    const isAdmin = currentUser.role === 'ADMIN';

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto relative pl-12 border-l-[4px] border-[#0088FF] shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
            <div className="relative z-0">
                <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6 sticky top-0 z-50 pt-4 pb-4 bg-[#F0F4F8]/80 backdrop-blur-xl border-b border-[#111827]/10">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#111827]">
                            {isAdmin ? 'Administrator Dashboard' : 'Teacher Dashboard'}
                        </h1>
                        <p className="text-[#111827]/70 mt-2 text-lg font-medium">
                            Welcome, {currentUser.name}
                        </p>
                    </div>

                    {isAdmin && (
                        <Dialog open={showModal} onOpenChange={setShowModal}>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] p-8 md:p-10 border-none shadow-2xl bg-[#E8EEF4] relative">
                                <div className="absolute top-0 left-0 bg-[#5D685C] text-white px-5 py-2.5 rounded-br-xl font-bold flex items-center gap-2 shadow-sm z-10">
                                    <Home size={18} /> Flip Classroom
                                </div>
                                
                                <DialogHeader className="mb-6 mt-6 md:mt-2 text-center md:text-left border-b border-[#111827]/10 pb-4">
                                    <DialogTitle className="text-3xl font-bold text-[#111827]">Administrator</DialogTitle>
                                    <DialogDescription className="text-[#111827]/70 font-medium">Configure a new virtual classroom space.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="flex flex-col space-y-6">
                                        {/* Row 1: Semester & Subject */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-[#111827] uppercase tracking-wider ml-1">Semester</label>
                                            <Select value={selectedSemester} onValueChange={(val) => {
                                                setSelectedSemester(val);
                                                setSelectedSubject("");
                                                setSelectedSection("");
                                            }}>
                                                <SelectTrigger className="w-full h-12 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium px-5 [&>svg]:text-white">
                                                    <SelectValue placeholder="Select semester" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-[#111827]/10 rounded-xl overflow-hidden shadow-xl">
                                                    <SelectItem value="ALL" className="font-bold focus:bg-[#E8EEF4] focus:text-[#111827]">All Semesters</SelectItem>
                                                    {availableSemesters.map(sem => (
                                                        <SelectItem key={sem} value={sem.toString()} className="focus:bg-[#E8EEF4] focus:text-[#111827] font-medium">Semester {sem}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-[#111827] uppercase tracking-wider ml-1">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedSemester}>
                                                <SelectTrigger className="w-full h-12 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium px-5 [&>svg]:text-white disabled:opacity-50">
                                                    <SelectValue placeholder={selectedSemester ? "Select a subject" : "Select a semester first"} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-[#111827]/10 rounded-xl overflow-hidden shadow-xl">
                                                    {filteredSubjectsForDropdown.map(sub => (
                                                        <SelectItem key={sub.id} value={sub.id} className="focus:bg-[#E8EEF4] focus:text-[#111827] py-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-[#111827]">{sub.name}</span>
                                                                <span className="text-[10px] text-[#111827]/60 uppercase tracking-widest">{sub.courseName} • Sem {sub.semester_number}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Row 2: Section & Assign Teacher */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-[#111827] uppercase tracking-wider ml-1 flex justify-between">
                                                Section
                                                {selectedSubject && sections.length === 0 && <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full">No active sections</span>}
                                            </label>
                                            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={sections.length === 0}>
                                                <SelectTrigger className="w-full h-12 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium px-5 [&>svg]:text-white disabled:opacity-50">
                                                    <SelectValue placeholder="Select section..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-[#111827]/10 rounded-xl overflow-hidden shadow-xl">
                                                    {sections.map(sec => (
                                                        <SelectItem key={sec} value={sec} className="focus:bg-[#E8EEF4] focus:text-[#111827] font-medium">Section {sec}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-sm font-bold text-[#111827] uppercase tracking-wider">Assign Teacher</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="globalTeachers"
                                                        checked={showAllTeachers}
                                                        onChange={(e) => setShowAllTeachers(e.target.checked)}
                                                        className="rounded text-[#0088FF] border-[#111827]/20 focus:ring-[#0088FF] w-4 h-4 cursor-pointer"
                                                    />
                                                    <label htmlFor="globalTeachers" className="text-xs text-[#111827]/60 cursor-pointer font-bold uppercase">Global</label>
                                                </div>
                                            </div>
                                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                                <SelectTrigger className="w-full h-12 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium px-5 [&>svg]:text-white">
                                                    <SelectValue placeholder="Select a teacher" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-[#111827]/10 rounded-xl overflow-hidden shadow-xl">
                                                    {eligibleTeachers.map(t => (
                                                        <SelectItem key={t.id} value={t.id} className="focus:bg-[#E8EEF4] font-medium focus:text-[#111827]">{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-6 sm:justify-end gap-3 mt-4 border-t border-[#111827]/10">
                                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="rounded-full h-12 px-6 text-[#111827]/60 font-bold hover:bg-white hover:text-[#111827] shadow-sm">
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading} className="rounded-full h-12 px-8 bg-[#767472] text-white font-bold hover:bg-[#5f5d5b] shadow-md transition-all">
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {loading ? 'Creating...' : 'Create Class'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </header>

                {isAdmin && classes.length > 0 && (
                    <div className="mb-8 flex flex-wrap gap-4 items-center bg-[#E8EEF4] p-4 rounded-xl shadow-sm border border-[#111827]/5">
                        <span className="text-sm font-bold text-[#111827] uppercase tracking-wider pl-2">Filters:</span>
                        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                            <SelectTrigger className="w-[200px] h-10 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium [&>svg]:text-white">
                                <SelectValue placeholder="All Teachers" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                                <SelectItem value="ALL" className="font-bold focus:bg-[#E8EEF4] focus:text-[#111827]">All Teachers</SelectItem>
                                {uniqueClassTeachers.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="focus:bg-[#E8EEF4] focus:text-[#111827] font-medium">{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className="w-[240px] h-10 rounded-full bg-[#767472] text-white border-none focus:ring-2 focus:ring-[#0088FF] shadow-sm font-medium [&>svg]:text-white">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                                <SelectItem value="ALL" className="font-bold focus:bg-[#E8EEF4] focus:text-[#111827]">All Subjects</SelectItem>
                                {uniqueClassSubjects.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="focus:bg-[#E8EEF4] focus:text-[#111827] font-medium">{s.name || s.id}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isAdmin && (
                        <Card
                            onClick={() => setShowModal(true)}
                            className="bg-[#E8EEF4]/50 border-2 border-dashed border-[#111827]/20 rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all hover:bg-[#E8EEF4] hover:border-[#0088FF] aspect-[1.1] group cursor-pointer shadow-none h-full"
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-6">
                                <div className="w-16 h-16 bg-[#767472] rounded-full shadow-sm flex items-center justify-center mb-4 text-white group-hover:bg-[#0088FF] transition-all duration-300">
                                    <Plus size={32} strokeWidth={2.5} />
                                </div>
                                <CardTitle className="text-xl font-bold text-[#111827]">Create Class</CardTitle>
                            </CardContent>
                        </Card>
                    )}

                    {classes.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-[#E8EEF4] rounded-xl border border-[#111827]/5">
                            <BookOpen className="w-12 h-12 text-[#111827]/20 mx-auto mb-4" />
                            <p className="text-[#111827]/70 font-medium mb-4">{isAdmin ? "No classrooms created yet" : "No classrooms have been assigned to you yet."}</p>
                            {isAdmin && (
                                <Button variant="link" onClick={() => setShowModal(true)} className="text-[#0088FF] font-bold text-md h-auto p-0 hover:underline">
                                    Create your first class
                                </Button>
                            )}
                        </div>
                    ) : (
                        displayedClasses.map((c) => (
                            <Link
                                to={`/class/${c.id}`}
                                key={c.id}
                                className="group relative block"
                            >
                                <Card className="bg-[#E8EEF4] border-l-[4px] border-l-transparent hover:border-l-[#0088FF] border border-[#111827]/5 rounded-xl p-2 transition-all hover:shadow-xl hover:shadow-[#111827]/5 flex flex-col justify-between aspect-[1.1] overflow-hidden shadow-sm h-full relative">
                                    
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setClassToDelete(c.id);
                                            }}
                                            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#111827]/5 text-[#111827]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            title="Delete Virtual Class"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <CardHeader className="relative z-10 p-5 pb-2">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="secondary" className="bg-[#111827]/5 text-[#111827] font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 rounded-sm border-none max-w-[150px] truncate">
                                                {c.subject?.course?.name || 'Unknown Course'}
                                            </Badge>
                                            <Badge variant="outline" className="bg-white text-[#111827] font-bold flex gap-1.5 px-2.5 py-1 rounded-sm border border-[#111827]/10 shadow-sm text-xs">
                                                <Users size={14} className="text-[#0088FF]" />
                                                {c._count?.enrollments || 0}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-2xl font-black text-[#111827] leading-tight transition-all duration-300">
                                            {c.subject?.name || 'Unknown Subject'}
                                        </CardTitle>
                                        <CardDescription className="font-semibold text-xs text-[#111827]/70 flex flex-col gap-1.5 mt-3">
                                            {isAdmin && <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#5D685C] block"></span> Teacher: {c.teacher?.name}</span>}
                                            <span className="flex items-center gap-2 opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-[#767472] block"></span> Section: {c.section || 'N/A'}</span>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardFooter className="relative z-10 p-5 pt-0 mt-auto flex items-center justify-between text-[#111827] font-bold">
                                        <span className="text-sm tracking-wide text-[#0088FF]">Enter Classroom</span>
                                        <div className="w-10 h-10 rounded-full bg-white border border-[#0088FF]/20 flex items-center justify-center text-[#0088FF] group-hover:bg-[#0088FF] group-hover:text-white transition-colors shadow-sm">
                                            <ChevronRight size={18} />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <Dialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
                    <DialogContent className="sm:max-w-md rounded-[24px] p-6 text-center border-none shadow-2xl">
                        <DialogHeader>
                            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} />
                            </div>
                            <DialogTitle className="text-2xl font-bold text-[#111827]">Delete Classroom?</DialogTitle>
                            <DialogDescription className="pt-2 text-[#64748B] font-medium pb-4">
                                This action cannot be undone. This will permanently delete the virtual classroom, all student enrollments, and their evaluation histories.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex sm:justify-center gap-3">
                            <Button type="button" variant="ghost" className="rounded-xl px-6 font-semibold" onClick={() => setClassToDelete(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => executeDeleteClass(classToDelete)}
                                className="bg-red-600 hover:bg-red-700 rounded-xl px-8 font-semibold shadow-md"
                            >
                                Yes, Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
