import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, GraduationCap, Users, ChevronRight, Loader2, UserPlus, BookOpen } from "lucide-react";

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
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [academicYear, setAcademicYear] = useState("2023-2024");
    const [enrollments, setEnrollments] = useState({}); // { studentId: 'A' | 'B' | null }

    useEffect(() => {
        if (!currentUser) return;

        setDataLoading(true);
        let url = '/api/virtual-classes';
        if (currentUser.role === 'TEACHER') {
            url += `?teacher_id=${currentUser.id}`;
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

    // Gather all subjects from the hierarchy
    const allSubjects = hierarchy.schools?.flatMap(school =>
        school.courses.flatMap(course =>
            course.subjects.map(subject => ({
                ...subject,
                courseName: course.name,
                schoolName: school.name
            }))
        )
    ) || [];

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedSubject || !selectedTeacher) {
            alert("Subject and Teacher are required.");
            return;
        }

        setLoading(true);
        const finalEnrollments = Object.entries(enrollments)
            .filter(([_, group]) => group !== null)
            .map(([student_id, group_label]) => ({ student_id, group_label }));

        try {
            await fetch('/api/virtual-classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: selectedSubject,
                    teacher_id: selectedTeacher,
                    academic_year: academicYear,
                    enrollments: finalEnrollments
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
                            <DialogTrigger asChild>
                                <Button size="lg" className="bg-[#111827] text-white hover:bg-gray-800 transition-all shadow-md hover:shadow-lg rounded-xl h-12 px-6 gap-2 group shrink-0">
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> New Virtual Class
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] p-8 border-none shadow-2xl">
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-2xl font-bold text-[#111827]">Create Virtual Class</DialogTitle>
                                    <DialogDescription className="text-gray-500">Assign a subject, teacher, and students to groups A and B.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder="Select a subject" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allSubjects.map(sub => (
                                                        <SelectItem key={sub.id} value={sub.id}>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{sub.name}</span>
                                                                <span className="text-[10px] text-gray-400 uppercase">{sub.courseName}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Assign Teacher</label>
                                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                                <SelectTrigger className="h-11 rounded-xl bg-gray-50">
                                                    <SelectValue placeholder="Select a teacher" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {teachers.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Academic Year</label>
                                        <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2023-2024" className="h-11 rounded-xl bg-gray-50 border-gray-200" />
                                    </div>

                                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-4">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <UserPlus size={18} className="text-[#E8B4B8]" />
                                            Student Enrollments
                                        </h3>
                                        <p className="text-xs text-gray-500 pb-2 border-b border-gray-200">Explicitly assign students to Group A, Group B, or leave unassigned.</p>

                                        <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                                            {students.map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white border text-sm transition-colors border-transparent hover:border-gray-100">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{s.name}</p>
                                                        <p className="text-xs text-gray-400">{s.roll_no}</p>
                                                    </div>
                                                    <Select
                                                        value={enrollments[s.id] || "NONE"}
                                                        onValueChange={(val) => setEnrollments(prev => ({ ...prev, [s.id]: val === "NONE" ? null : val }))}
                                                    >
                                                        <SelectTrigger className="w-[120px] h-8 bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NONE" className="text-gray-400 italic">None</SelectItem>
                                                            <SelectItem value="A" className="font-bold text-blue-600">Group A</SelectItem>
                                                            <SelectItem value="B" className="font-bold text-purple-600">Group B</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                            {students.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">No students found in the system.</p>}
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isAdmin && (
                        <Card
                            onClick={() => setShowModal(true)}
                            className="bg-transparent border-2 border-dashed border-gray-200 rounded-[24px] p-2 flex flex-col items-center justify-center text-center transition-all hover:border-[#E8B4B8] hover:bg-white/50 aspect-square group cursor-pointer shadow-none"
                        >
                            <CardContent className="flex flex-col items-center justify-center h-full p-6">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-gray-400 group-hover:text-[#E8B4B8] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                    <Plus size={28} />
                                </div>
                                <CardTitle className="text-xl font-bold text-[#111827] mb-2">New Class</CardTitle>
                                <CardDescription className="text-sm font-medium px-4">Create a new virtual environment</CardDescription>
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
                        classes.map((c) => (
                            <Link
                                to={`/class/${c.id}`}
                                key={c.id}
                                className="group relative block"
                            >
                                <Card className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[24px] p-2 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#111827]/5 flex flex-col justify-between aspect-[1.1] overflow-hidden shadow-sm h-full">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E8B4B8]/0 to-[#E8B4B8]/0 group-hover:to-[#E8B4B8]/10 transition-colors duration-500 pointer-events-none rounded-[24px]"></div>

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

            </div>
        </div>
    );
}
