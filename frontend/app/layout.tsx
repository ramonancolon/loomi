import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeToggle } from '@/components/ThemeToggle'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-jetbrains',
})

export const metadata: Metadata = {
    title: 'Campaign Studio',
    description: 'AI-powered creative campaign generation platform',
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#f4f6f8' },
        { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var s=localStorage.getItem('loomi:theme');var p=s==='light'||s==='dark'||s==='system'?s:'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var e=p==='system'?(d?'dark':'light'):p;var r=document.documentElement;if(e==='dark')r.classList.add('dark');r.dataset.theme=e;}catch(e){}})();`,
                    }}
                />
            </head>
            <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-bg-theme font-sans antialiased`}>
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:font-semibold focus:text-text-main focus:shadow-lg"
                >
                    Skip to main content
                </a>

                <header className="sticky top-0 z-50 border-b border-border-theme bg-surface/80 backdrop-blur-sm">
                    <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
                        <div className="flex items-center gap-3">
                            <div className="brand-mark" aria-hidden="true">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-bold tracking-tight text-text-main">Campaign Studio</p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                <main id="main-content" className="container mx-auto px-4 py-8 sm:px-6 lg:px-10">
                    {children}
                </main>

                <div
                    aria-live="polite"
                    aria-atomic="false"
                    className="sr-only"
                    id="reasoning-stream"
                />
            </body>
        </html>
    )
}
