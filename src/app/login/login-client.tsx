"use client"

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F8FAFC]">
            {/* Subtle background rings replicating the light wave aesthetic */}
            <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full border-[1.5px] border-blue-50/50" />
            <div className="absolute top-[0%] left-[0%] w-[50vw] h-[50vw] rounded-full border-[1.5px] border-blue-50/50" />
            
            <div className="relative z-10 w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-10">
                <h1 className="text-[26px] font-bold text-[#1e293b] mb-8 tracking-tight">Welcome Back</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-sm font-semibold text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Email or ID</label>
                        <div className="relative flex items-center">
                            <Mail className="absolute left-4 w-5 h-5 text-[#94a3b8]" />
                            <Input 
                                required 
                                type="text" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email or ERP ID" 
                                className="h-14 pl-12 bg-[#F1F5F9] border-transparent hover:border-[#e2e8f0] focus:border-[#3b82f6] text-[#334155] placeholder:text-[#94a3b8] rounded-2xl focus-visible:ring-0 font-medium transition-colors shadow-none" 
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Password</label>
                            <a href="#" className="text-[12px] font-bold text-[#3b82f6] hover:text-[#2563eb] transition-colors">Forgot Password?</a>
                        </div>
                        <div className="relative flex items-center">
                            <Lock className="absolute left-4 w-5 h-5 text-[#94a3b8]" />
                            <Input 
                                required 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••" 
                                className="h-14 pl-12 bg-[#F1F5F9] border-transparent hover:border-[#e2e8f0] focus:border-[#3b82f6] text-[#334155] placeholder:text-[#94a3b8] rounded-2xl focus-visible:ring-0 font-bold transition-colors shadow-none text-xl tracking-[0.2em]" 
                            />
                        </div>
                    </div>

                    <Button 
                        disabled={loading} 
                        type="submit" 
                        className="w-full h-14 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-2xl font-bold shadow-[0_8px_20px_-6px_rgba(59,130,246,0.6)] text-[15px] mt-4 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin text-white mx-auto" /> : "Log In"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="bg-white px-3 text-[#64748b]">Or try a demo session</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleDemoLogin('admin')}
                        className="h-12 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        Admin Mode
                    </Button>
                    <Button 
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleDemoLogin('teacher')}
                        className="h-12 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        Teacher Mode
                    </Button>
                </div>
            </div>
        </div>
    );
}
