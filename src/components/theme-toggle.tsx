"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 ${className}`} />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`w-10 h-10 rounded-2xl bg-white dark:bg-[#111A17] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-emerald-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-emerald-400 shadow-xs flex items-center justify-center transition-all duration-200 group cursor-pointer ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
      )}
    </button>
  )
}
