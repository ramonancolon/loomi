'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { StructuredCopyPreview } from './StructuredCopyPreview'
import DOMPurify from 'dompurify'
import { prepareUiPreviewHtml } from '@/lib/uiPreview'
import { AssetActionBar } from './AssetActionBar'
import type { RerollAsset } from '@/types/campaign'

interface Recommendation {
    copy: string
    imageUrl: string
    uiComponent: string
}

interface CampaignResultsPanelProps {
    recommendation: Recommendation
    assetFilenames: { copy: string; image: string; ui: string }
    onDownloadCopy: () => void
    onDownloadImage: () => void
    onDownloadUi: () => void
    onRerollAsset: (asset: RerollAsset) => void
    canRerollAssets: boolean
    rerollingAsset: RerollAsset | null
    onDispatch?: () => void
    isDispatching?: boolean
    dispatchSuccess?: boolean
}

export function CampaignResultsPanel({
    recommendation,
    assetFilenames,
    onDownloadCopy,
    onDownloadImage,
    onDownloadUi,
    onRerollAsset,
    canRerollAssets,
    rerollingAsset,
    onDispatch,
    isDispatching,
    dispatchSuccess,
}: CampaignResultsPanelProps) {
    const canRerollCopy = canRerollAssets && recommendation.copy
    const canRerollImage = canRerollAssets && recommendation.imageUrl && recommendation.copy
    const canRerollUi = canRerollAssets && recommendation.uiComponent && recommendation.copy && recommendation.imageUrl

    return (
        <ErrorBoundary>
            <div className="flex-1 space-y-6 overflow-y-auto">
                <div className="card">
                    <h3 className="mb-4 text-lg font-bold text-text-main">Generated Marketing Copy</h3>
                    {recommendation.copy ? (
                        <StructuredCopyPreview copy={recommendation.copy} />
                    ) : (
                        <div className="flex h-24 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                            Generating copy...
                        </div>
                    )}
                    <AssetActionBar
                        onDownload={onDownloadCopy}
                        onReroll={() => onRerollAsset('copy')}
                        downloadDisabled={!recommendation.copy}
                        rerollDisabled={!canRerollCopy || rerollingAsset === 'copy'}
                        rerolling={rerollingAsset === 'copy'}
                    />
                </div>

                <div className="card">
                    <h3 className="mb-4 text-lg font-bold text-text-main">Campaign Visual</h3>
                    {recommendation.imageUrl ? (
                        <img
                            src={recommendation.imageUrl}
                            alt="Campaign Visual"
                            className="w-full rounded-lg shadow-sm"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/e2e8f0/475569?text=Visual+Generation+Failed'
                            }}
                        />
                    ) : (
                        <div className="flex h-48 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                            Generating Visual...
                        </div>
                    )}
                    <AssetActionBar
                        onDownload={onDownloadImage}
                        onReroll={() => onRerollAsset('image')}
                        downloadDisabled={!recommendation.imageUrl}
                        rerollDisabled={!canRerollImage || rerollingAsset === 'image'}
                        rerolling={rerollingAsset === 'image'}
                    />
                </div>

                <div className="card">
                    <h3 className="mb-4 text-lg font-bold text-text-main">UI Layout Preview</h3>
                    {recommendation.uiComponent ? (
                        <div className="space-y-3">
                            <div
                                className="ui-layout-preview overflow-hidden rounded-lg border border-border-theme shadow-inner"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prepareUiPreviewHtml(recommendation.uiComponent)) }}
                            />
                            <details className="rounded-lg border border-border-theme bg-bg-theme">
                                <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-text-muted">
                                    View HTML source
                                </summary>
                                <pre className="max-h-64 overflow-auto border-t border-border-theme p-4 text-xs text-text-main">
                                    <code>{recommendation.uiComponent}</code>
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <div className="flex h-32 animate-pulse items-center justify-center rounded-lg bg-bg-theme text-text-muted">
                            Generating UI Layout...
                        </div>
                    )}
                    <AssetActionBar
                        onDownload={onDownloadUi}
                        onReroll={() => onRerollAsset('ui')}
                        downloadDisabled={!recommendation.uiComponent}
                        rerollDisabled={!canRerollUi || rerollingAsset === 'ui'}
                        rerolling={rerollingAsset === 'ui'}
                    />
                </div>

                {dispatchSuccess && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Campaign dispatched successfully!</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onDispatch}
                        disabled={isDispatching || !onDispatch}
                        className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {isDispatching ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Dispatching...
                            </span>
                        ) : (
                            'Dispatch Campaign'
                        )}
                    </button>
                </div>
            </div>
        </ErrorBoundary>
    )
}
