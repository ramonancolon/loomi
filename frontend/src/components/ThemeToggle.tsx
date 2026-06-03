'use client'

import { useEffect, useState } from 'react'

type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'loomi:theme'

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(preference: ThemePreference): void {
    const effective = preference === 'system' ? getSystemTheme() : preference
    document.documentElement.classList.toggle('dark', effective === 'dark')
    document.documentElement.dataset.theme = effective
}

export function ThemeToggle() {
    const [preference, setPreference] = useState<ThemePreference>('system')

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        const initial: ThemePreference =
            stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
        setPreference(initial)
        applyTheme(initial)

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => {
            const current = localStorage.getItem(STORAGE_KEY)
            const pref: ThemePreference =
                current === 'light' || current === 'dark' || current === 'system' ? current : 'system'
            if (pref === 'system') applyTheme('system')
        }
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [])

    const cycleTheme = () => {
        const next: ThemePreference =
            preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light'
        setPreference(next)
        localStorage.setItem(STORAGE_KEY, next)
        applyTheme(next)
    }

    const label =
        preference === 'light' ? 'Light mode' : preference === 'dark' ? 'Dark mode' : 'System theme'

    return (
        <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Theme: ${label}. Click to change.`}
            title={label}
            className="glass-btn glass-btn-secondary px-3 py-2 text-sm"
        >
            {preference === 'light' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )}
            {preference === 'dark' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
            {preference === 'system' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    )
}
