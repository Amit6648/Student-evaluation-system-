"use client"

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, Lightbulb, Shield, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPageClient() {
    const { login } = useAuth();
    const router = useRouter();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        const result = await login(email, password);
        if (result.success) {
            router.push("/admin/dashboard");
            router.refresh();
        } else {
            setError(result.error || "Login failed");
            setLoading(false);
        }
    };

    const handleDemoLogin = async (role: 'admin' | 'teacher') => {
        setLoading(true);
        setError("");
        
        const demoEmail = role === 'admin' ? 'admin@school.com' : 'john@school.com';
        const demoPassword = 'password123';
        
        const result = await login(demoEmail, demoPassword);
        if (result.success) {
            router.push("/admin/dashboard");
            router.refresh();
        } else {
            setError(result.error || `Demo ${role} login failed`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F4F7F6]">
            {/* Background subtle Nordic ripples */}
            <div className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] rounded-full border border-emerald-900/5 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full border border-emerald-900/5 pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-slate-200/80 p-8 sm:p-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Lightbulb className="text-emerald-700 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#11221F] tracking-tight leading-none">Flip Classroom</h1>
                        <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Evaluation System</span>
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-[#11221F] mb-6 tracking-tight">Welcome Back</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs font-semibold text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email or ID</label>
                        <div className="relative flex items-center">
                            <Mail className="absolute left-4 w-4 h-4 text-slate-400" />
                            <Input 
                                required 
                                type="text" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email or ERP ID" 
                                className="h-12 pl-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 rounded-full focus-visible:ring-1 focus-visible:ring-emerald-500 font-medium transition-colors shadow-none text-xs" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                            <a href="#" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors">Forgot?</a>
                        </div>
                        <div className="relative flex items-center">
                            <Lock className="absolute left-4 w-4 h-4 text-slate-400" />
                            <Input 
                                required 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••" 
                                className="h-12 pl-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 rounded-full focus-visible:ring-1 focus-visible:ring-emerald-500 font-bold transition-colors shadow-none text-lg tracking-[0.15em]" 
                            />
                        </div>
                    </div>

                    <Button 
                        disabled={loading} 
                        type="submit" 
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-md shadow-emerald-600/20 text-sm mt-4 transition-all hover:scale-[1.01]"
                    >
                        {loading ? <Loader2 className="animate-spin text-white mx-auto" /> : "Log In"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="bg-white px-3 text-slate-400">Or try a demo session</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleDemoLogin('admin')}
                        className="h-11 border-slate-200 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-900 text-slate-700 rounded-full font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
                    >
                        <Shield size={14} className="text-emerald-700" />
                        Admin Mode
                    </Button>
                    <Button 
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleDemoLogin('teacher')}
                        className="h-11 border-slate-200 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-900 text-slate-700 rounded-full font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
                    >
                        <GraduationCap size={14} className="text-emerald-700" />
                        Teacher Mode
                    </Button>
                </div>
            </div>
        </div>
    );
}
