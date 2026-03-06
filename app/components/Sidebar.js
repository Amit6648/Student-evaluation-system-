"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, Settings, HelpCircle, LogOut } from "lucide-react";

export default function Sidebar({ className }) {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Settings", href: "#", icon: Settings },
        { name: "Support", href: "#", icon: HelpCircle },
    ];

    return (
        <aside className={`${className} bg-[#0A0A0A] border-r border-white/5 text-white flex flex-col fixed top-0 left-0 w-64 h-screen z-50 overflow-y-auto overflow-x-hidden`}>
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B4B8]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            {/* Brand */}
            <div className="p-8 flex items-center gap-4 relative z-10 border-b border-white/5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8B4B8] to-[#c78b90] p-[1px] shadow-lg shadow-[#E8B4B8]/20 flex shrink-0">
                    <div className="w-full h-full bg-[#0A0A0A] rounded-[11px] flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-[#E8B4B8]" />
                    </div>
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Flip</h1>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Classroom</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1.5 px-4 relative z-10">
                <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Main Menu</p>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold group relative
                            ${isActive
                                    ? "text-white"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {/* Active State Details */}
                            {isActive && (
                                <>
                                    <div className="absolute inset-0 bg-white/10 rounded-xl border border-white/10 shadow-inner"></div>
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E8B4B8] rounded-r-md"></div>
                                </>
                            )}

                            {/* Hover State Background */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"></div>
                            )}

                            <item.icon size={18} className={`relative z-10 ${isActive ? "text-[#E8B4B8]" : "group-hover:text-gray-300 transition-colors"}`} />
                            <span className="relative z-10">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Profile */}
            <div className="p-4 border-t border-white/5 relative z-10">
                <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/10">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center shadow-inner">
                        <span className="text-xs font-bold text-gray-300">PK</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate transition-colors">Paramjit Kaur</p>
                    </div>
                    <LogOut size={16} className="text-gray-600 group-hover:text-[#E8B4B8] transition-colors" />
                </button>
            </div>
        </aside>
    );
}
