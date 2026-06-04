'use client'

import { VIBES, PLATFORMS } from '@/constants/campaign'
import type { CampaignRequest } from '@/types/campaign'

export interface CampaignBriefFormProps {
    formData: CampaignRequest
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onSubmit: () => void
    isWorking: boolean
    error: string | null
}

export function CampaignBriefForm({
    formData,
    onChange,
    onSubmit,
    isWorking,
    error,
}: CampaignBriefFormProps) {
    return (
        <div className="glass-panel flex w-full flex-col gap-6 p-6 lg:w-1/3">
            <div>
                <label htmlFor="brandName" className="field-label">Brand Name</label>
                <input
                    id="brandName"
                    type="text"
                    name="brandName"
                    value={formData.brandName}
                    onChange={onChange}
                    placeholder="e.g., Nexus Athletics"
                    className="input-field"
                    disabled={isWorking}
                />
            </div>

            <div>
                <label htmlFor="campaignGoal" className="field-label">Campaign Goal</label>
                <textarea
                    id="campaignGoal"
                    name="campaignGoal"
                    value={formData.campaignGoal}
                    onChange={onChange}
                    placeholder="e.g., Win back customers who haven't purchased in 6 months..."
                    className="input-field h-24 resize-none"
                    disabled={isWorking}
                />
            </div>

            <div>
                <label htmlFor="targetAudience" className="field-label">Target Audience Segment</label>
                <input
                    id="targetAudience"
                    type="text"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={onChange}
                    placeholder="e.g., Lapsed VIPs"
                    className="input-field"
                    disabled={isWorking}
                />
            </div>

            <div>
                <label htmlFor="vibe" className="field-label">Creative Vibe</label>
                <select
                    id="vibe"
                    name="vibe"
                    value={formData.vibe}
                    onChange={onChange}
                    className="input-field"
                    disabled={isWorking}
                >
                    {VIBES.map((vibe) => (
                        <option key={vibe.id} value={vibe.id}>{vibe.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="platform" className="field-label">Platform</label>
                <select
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={onChange}
                    className="input-field"
                    disabled={isWorking}
                >
                    {PLATFORMS.map((platform) => (
                        <option key={platform.id} value={platform.id}>{platform.name}</option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-100 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={onSubmit}
                disabled={isWorking || !formData.brandName || !formData.campaignGoal || !formData.targetAudience}
                className={`glass-btn w-full py-3 ${isWorking
                        ? 'cursor-not-allowed bg-primary-theme/50 text-white'
                        : 'glass-btn-primary'
                    }`}
            >
                {isWorking ? 'Agent Active...' : 'Launch Autonomous Agent'}
            </button>
        </div>
    )
}
