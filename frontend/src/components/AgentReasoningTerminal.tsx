'use client'

export interface AgentReasoningTerminalProps {
    reasoningStream: string[]
    isReasoning: boolean
    className?: string
}

export function AgentReasoningTerminal({
    reasoningStream,
    isReasoning,
    className = '',
}: AgentReasoningTerminalProps) {
    return (
        <div
            className={`terminal-panel shrink-0 ${className}`.trim()}
            aria-live="polite"
            aria-atomic="false"
        >
            <p className="mb-2 text-slate-500"># Agent Reasoning Stream</p>
            {reasoningStream.map((log, idx) => (
                <div key={idx} className="mb-1 animate-fade-in opacity-90">
                    <span className="mr-2 text-slate-500">{'>'}</span>
                    {log}
                </div>
            ))}
            {isReasoning && (
                <div className="animate-pulse text-emerald-500">_</div>
            )}
        </div>
    )
}
