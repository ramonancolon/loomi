import { parseStructuredCopy } from '@/lib/structuredCopy'

interface StructuredCopyPreviewProps {
    copy: string
    compact?: boolean
    embedded?: boolean
}

export function StructuredCopyPreview({
    copy,
    compact = false,
    embedded = false,
}: StructuredCopyPreviewProps) {
    const parsed = parseStructuredCopy(copy)

    if (!parsed.title && parsed.paragraphs.length === 0) {
        return <p className="text-sm text-text-muted">Preview unavailable.</p>
    }

    return (
        <div
            className={
                embedded
                    ? 'rounded-lg border border-primary-theme/20 bg-primary-theme/5 p-4'
                    : 'rounded-lg border border-border-theme bg-bg-theme p-4'
            }
        >
            {parsed.title && (
                <p className={`font-semibold text-text-main ${compact ? 'text-base' : 'text-xl'}`}>
                    {parsed.title}
                </p>
            )}
            <div className={`space-y-2 ${parsed.title ? 'mt-3' : ''}`}>
                {parsed.paragraphs.map((paragraph, index) => (
                    <p
                        key={index}
                        className={`text-text-muted ${compact ? 'text-sm leading-relaxed' : 'text-base leading-relaxed'}`}
                    >
                        {paragraph}
                    </p>
                ))}
            </div>
        </div>
    )
}
