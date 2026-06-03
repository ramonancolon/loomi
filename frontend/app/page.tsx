import { CreativeStudioWorkspace } from '@/components/CreativeStudioWorkspace'

export default function HomePage() {
    return (
        <div className="space-y-10">
            <section className="space-y-4 py-8 text-center sm:py-12">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary-theme">
                    Autonomous Campaign Agent
                </p>
                <h1 className="text-balance text-4xl font-bold tracking-tight text-text-main sm:text-5xl lg:text-6xl">
                    Campaign Studio
                </h1>
                <p className="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted">
                    Turn segment and catalog intelligence into review-ready campaign artifacts.
                    The agent reasons over Loomi Connect MCP tools, recommends a strategy, and waits for your approval before generating copy, visuals, and layout.
                </p>
            </section>

            <CreativeStudioWorkspace />
        </div>
    )
}
