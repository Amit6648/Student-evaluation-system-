import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, GraduationCap, Users, ChevronRight, Loader2, UserPlus, BookOpen, Trash2 } from "lucide-react";

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
    const [academicYear, setAcademicYear] = useState("2023-2024");
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
                    academic_year: academicYear,
                    section: selectedSection,
                    enrollments: []
                })
            });

            // Reload classes
            const updatedRes = await fetch('/api/virtual-classes');
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
        return <div className="min-h-screen p-8 max-w-7xl mx-auto flex justify-center items-center font-bold text-gray-500">Loading Dashboard...</div>;
    }

    const isAdmin = currentUser.role === 'ADMIN';

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto">
            <div className="relative z-0">
                <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-pink-50/50 opacity-60 pointer-events-none"></div>

                <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#111827] flex items-center gap-3">
                            <GraduationCap className="w-10 h-10 text-[#E8B4B8]" />
                            {isAdmin ? 'Admin Dashboard' : 'Teacher Dashboard'}
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">
                            {isAdmin ? 'Manage school hierarchy, courses, and cross-department assignments.' : `Manage your flipped classrooms, ${currentUser.name}`}
                        </p>
                    </div>

                    {isAdmin && (
                        <Dialog open={showModal} onOpenChange={setShowModal}>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] p-8 border-none shadow-2xl">
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-2xl font-bold text-[#111827]">Create Virtual Class</DialogTitle>
                                    <DialogDescription className="text-gray-500">Assign a subject, teacher, and students to groups A and B.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Semester</label>
                                            <Select value={selectedSemester} onValueChange={(val) => {
                                                setSelectedSemester(val);
                                                setSelectedSubject("");
                                                setSelectedSection("");
                                            }}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder="Select semester" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALL">All Semesters</SelectItem>
                                                    {availableSemesters.map(sem => (
                                                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedSemester}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder={selectedSemester ? "Select a subject" : "Select a semester first"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredSubjectsForDropdown.map(sub => (
                                                        <SelectItem key={sub.id} value={sub.id}>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{sub.name}</span>
                                                                <span className="text-[10px] text-gray-400 uppercase">{sub.courseName} • Sem {sub.semester_number}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-semibold text-gray-700">Assign Teacher</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="globalTeachers"
                                                        checked={showAllTeachers}
                                                        onChange={(e) => setShowAllTeachers(e.target.checked)}
                                                        className="rounded text-[#E8B4B8] border-gray-300 focus:ring-[#E8B4B8]"
                                                    />
                                                    <label htmlFor="globalTeachers" className="text-xs text-gray-500 cursor-pointer">Global Override</label>
                                                </div>
                                            </div>
                                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder="Select a teacher" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {eligibleTeachers.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Academic Year</label>
                                            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2023-2024" className="h-11 rounded-xl bg-gray-50 border-gray-200" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex justify-between">
                                                Section
                                                {selectedSubject && sections.length === 0 && <span className="text-xs text-orange-500 font-normal">No active sections found</span>}
                                            </label>
                                            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={sections.length === 0}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder="Select section..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sections.map(sec => (
                                                        <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4 sm:justify-end gap-3">
                                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl h-11 px-5 text-gray-600 font-semibold hover:bg-gray-100">
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading} className="rounded-xl h-11 px-6 bg-[#111827] text-white font-semibold hover:bg-gray-800">
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
                    <div className="mb-8 flex flex-wrap gap-4 items-center bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-black/5 shadow-sm">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-2">Filters:</span>
                        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                            <SelectTrigger className="w-[200px] h-9 rounded-xl bg-white border-0 shadow-sm font-medium">
                                <SelectValue placeholder="All Teachers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="font-bold">All Teachers</SelectItem>
                                {uniqueClassTeachers.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className="w-[240px] h-9 rounded-xl bg-white border-0 shadow-sm font-medium">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="font-bold">All Subjects</SelectItem>
                                {uniqueClassSubjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isAdmin && (
                        <Card
                            onClick={() => setShowModal(true)}
                            className="bg-transparent border-2 border-dashed border-[#E8B4B8]/60 rounded-[24px] p-2 flex flex-col items-center justify-center text-center transition-all hover:bg-[#E8B4B8]/5 aspect-[1.1] group cursor-pointer shadow-none h-full"
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-6">
                                <div className="w-16 h-16 bg-white border border-gray-100 rounded-[20px] shadow-sm flex items-center justify-center mb-4 text-[#E8B4B8] group-hover:scale-110 transition-transform duration-300">
                                    <Plus size={32} strokeWidth={2.5} />
                                </div>
                                <CardTitle className="text-xl font-bold text-[#111827] mb-2">Create New Virtual Class</CardTitle>
                                <CardDescription className="text-sm font-medium px-4">Set up a new learning environment</CardDescription>
                            </CardContent>
                        </Card>
                    )}

                    {classes.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white/40 rounded-[24px] border border-black/5">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">{isAdmin ? "No classrooms created yet" : "No classrooms have been assigned to you yet."}</p>
                            {isAdmin && (
                                <Button variant="link" onClick={() => setShowModal(true)} className="text-[#E8B4B8] font-semibold text-md h-auto p-0">
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
                                <Card className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-2 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#111827]/5 flex flex-col justify-between aspect-[1.1] overflow-hidden shadow-sm h-full relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E8B4B8]/0 to-[#E8B4B8]/0 group-hover:to-[#E8B4B8]/10 transition-colors duration-500 pointer-events-none rounded-[24px]"></div>

                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setClassToDelete(c.id);
                                            }}
                                            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            title="Delete Virtual Class"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <CardHeader className="relative z-10 p-5 pb-2">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="secondary" className="bg-[#E8B4B8]/10 text-[#E8B4B8] hover:bg-[#E8B4B8]/20 font-bold uppercase tracking-wider text-xs px-2.5 py-1 rounded-full border-none max-w-[150px] truncate">
                                                {c.subject?.course?.name || 'Unknown Course'}
                                            </Badge>
                                            <Badge variant="outline" className="bg-gray-50 text-gray-500 font-bold flex gap-1.5 px-2.5 py-1 rounded-full border border-gray-100 shadow-sm text-xs">
                                                <Users size={14} className="text-[#E8B4B8]" />
                                                {c._count?.enrollments || 0}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-2xl font-extrabold text-[#111827] leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#111827] group-hover:to-gray-600 transition-all duration-300">
                                            {c.subject?.name || 'Unknown Subject'}
                                        </CardTitle>
                                        <CardDescription className="font-medium text-xs flex flex-col gap-1.5 mt-2">
                                            {isAdmin && <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-400 block"></span> Teacher: {c.teacher?.name}</span>}
                                            <span className="flex items-center gap-1 opacity-70"><span className="w-1 h-1 rounded-full bg-gray-400 block"></span> Year: {c.academic_year}</span>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardFooter className="relative z-10 p-5 pt-0 mt-auto flex items-center justify-between text-[#E8B4B8] font-bold">
                                        <span className="text-sm tracking-wide group-hover:translate-x-1 transition-transform">Enter Classroom</span>
                                        <div className="w-10 h-10 rounded-full bg-white border border-[#E8B4B8]/20 flex items-center justify-center group-hover:bg-[#E8B4B8] group-hover:text-white transition-all shadow-sm">
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
                            <DialogDescription className="pt-2 text-gray-500 font-medium pb-4">
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
