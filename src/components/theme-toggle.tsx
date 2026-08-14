"use client"

import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`flex items-center justify-between bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/10 ${className}`}>
        <div className="w-8 h-7 rounded-lg" />
      </div>
    )
  }

  return (
    <div className={`flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/60 dark:border-white/10 ${className}`}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
          theme === "light"
            ? "bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        }`}
        title="Light Mode"
      >
        <Sun size={14} className={theme === "light" ? "text-amber-500" : ""} />
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
          theme === "dark"
            ? "bg-white text-slate-900 shadow-xs dark:bg-emerald-700 dark:text-white"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        }`}
        title="Dark Mode"
      >
        <Moon size={14} className={theme === "dark" ? "text-emerald-200" : ""} />
        <span className="hidden sm:inline">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
          theme === "system"
            ? "bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        }`}
        title="System Preference"
      >
        <Laptop size={14} />
        <span className="hidden sm:inline">Auto</span>
      </button>
    </div>
  )
}
