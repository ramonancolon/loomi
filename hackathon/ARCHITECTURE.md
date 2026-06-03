# Architecture Overview — Campaign Studio

## System context

**Export for submission:** [architecture-diagram.png](./architecture-diagram.png) · [architecture-diagram.pdf](./architecture-diagram.pdf) · [architecture-diagram.svg](./architecture-diagram.svg)

```mermaid
flowchart TB
    subgraph User
        M[Marketer]
    end

    subgraph UI["Next.js — Campaign Studio"]
        Form[Campaign brief form]
        Banner[MCP connection banner]
        Stream[Reasoning stream + evidence]
        Approve[Human approval gate]
        Assets[Copy / image / UI artifacts]
    end

    subgraph API["Express API"]
        Routes[Campaign + MCP auth routes]
    end

    subgraph Orchestration["Temporal"]
        WF[CampaignGenerationWorkflow]
        A1[agentReasoningActivity]
        A2[generateCopyActivity]
        A3[generateImageActivity]
        A4[generateUIActivity]
    end

    subgraph Agent["Reasoning layer"]
        Gemini[Gemini + automatic MCP function calling]
    end

    subgraph Loomi["Loomi Connect MCP"]
        Conv[Conversations / catalog MCP]
        Mkt[Marketing MCP — OAuth]
        Ana[Analytics tools — same OAuth server]
    end

    M --> Form
    Form --> Routes
    Banner --> Routes
    Routes --> WF
    WF --> A1
    A1 --> Gemini
    Gemini --> Conv
    Gemini --> Mkt
    Gemini --> Ana
    A1 --> Stream
    Stream --> Approve
    Approve -->|approveCampaign signal| WF
    WF --> A2 --> A3 --> A4
    A2 --> Assets
    A3 --> Assets
    A4 --> Assets
```

## Request flow

1. **POST `/api/campaigns`** — starts `CampaignGenerationWorkflow`.
2. **Phase 1 — Reasoning** (`agentReasoningActivity`):
   - `connectMcpClients()` → Conversation MCP + Marketing/Analytics MCP (if OAuth complete).
   - Gemini `mcpToTool` with up to 12 automatic tool calls.
   - Returns `reasoningStream`, `evidence`, `recommendedVibe`, `copyPreviewBlurb`, `usedLiveMcp`.
3. **Phase 2 — Recommendation** — workflow status `recommendation_ready`; blocks on `approveCampaign` signal.
4. **Phase 3 — Act** — copy → image → UI activities (no MCP required; uses approved strategy).
5. **GET `/api/campaigns/:id/progress`** — SSE updates for the UI.

## Key components

| Layer | Location |
|-------|----------|
| UI | `frontend/src/components/CreativeStudioWorkspace.tsx`, `McpConnectionBanner.tsx` |
| API | `backend/src/api/routes/campaignRoutes.ts`, `mcpAuthRoutes.ts` |
| Workflow | `backend/src/workflow/campaignGenerationWorkflow.ts` |
| MCP connect | `backend/src/mcp/connect.ts`, `oauthProvider.ts` |
| Agent prompt | `backend/src/mcp/reasoningPrompt.ts` |
| Reasoning | `backend/src/activity/reasoningActivity.ts` |

## Data flow

- **Into the agent:** campaign brief fields only (brand, goal, audience, platform, vibe) + MCP tool responses from sandbox.
- **Out of the agent:** structured JSON strategy, streamed reasoning lines, evidence bullets.
- **Stored:** Temporal workflow state; generated assets under `backend/.generated-assets/` when applicable.
- **Not stored:** production PII; OAuth tokens in `backend/.mcp-oauth/session.json` (local, gitignored).

## Human approval

```mermaid
sequenceDiagram
    participant U as Marketer
    participant UI as Campaign Studio
    participant T as Temporal workflow
    participant MCP as Loomi Connect

    U->>UI: Submit brief
    UI->>T: Start workflow
    T->>MCP: Tool calls via Gemini
    MCP-->>T: Segment / catalog / metrics
    T-->>UI: recommendation_ready + evidence
    U->>UI: Approve & Execute
    UI->>T: approveCampaign signal
    T->>T: Generate copy, image, UI
    T-->>UI: complete
```

## Production next steps

See [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md).

## Known limitations

- Analytics and Marketing share one MCP endpoint in this build (`MCP_MARKETING_URL`); separate `MCP_ANALYTICS_URL` supported via env.
- Asset generation does not push campaigns into Engagement.
- Demo fallback segment heuristics activate only when no live MCP + Gemini path is available.
