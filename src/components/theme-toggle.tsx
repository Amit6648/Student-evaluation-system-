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
      <div className={`w-11 h-11 rounded-2xl bg-white/80 dark:bg-[#111A17]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 ${className}`} />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`w-11 h-11 rounded-2xl bg-white/90 dark:bg-[#111A17]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-emerald-300 hover:bg-white dark:hover:bg-[#16221E] hover:border-emerald-500/50 shadow-md shadow-emerald-950/5 dark:shadow-none flex items-center justify-center transition-all duration-200 group cursor-pointer hover:scale-105 active:scale-95 ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-emerald-400 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-200" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500 group-hover:scale-110 group-hover:rotate-45 transition-transform duration-200" />
      )}
    </button>
  )
}
