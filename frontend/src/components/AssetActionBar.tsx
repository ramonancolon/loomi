'use client'

import type { RerollAsset } from '@/types/campaign'

export interface AssetActionBarProps {
    onDownload: () => void
    onReroll: () => void
    downloadDisabled?: boolean
    rerollDisabled?: boolean
    rerolling?: boolean
    asset?: RerollAsset
}

export function AssetActionBar({
    onDownload,
    onReroll,
    downloadDisabled = false,
    rerollDisabled = false,
    rerolling = false,
    asset,
}: AssetActionBarProps) {
    return (
        <div className="mt-2 flex justify-end gap-2">
            <button
                type="button"
                onClick={onDownload}
                disabled={downloadDisabled}
                className="rounded-md border border-border-theme px-2 py-1 text-xs text-text-muted transition hover:bg-bg-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
                Download
            </button>
            <button
                type="button"
                onClick={onReroll}
                disabled={rerollDisabled || rerolling}
                className="rounded-md border border-border-theme px-2 py-1 text-xs text-text-muted transition hover:bg-bg-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
                {rerolling ? 'Rerolling…' : 'Reroll'}
            </button>
        </div>
    )
}
