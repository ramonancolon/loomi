# Qwen Refactor Tasks (Deferred)

These tasks were intentionally deferred from the initial production refactor because they are large, repetitive, or better suited to a focused follow-up pass with Qwen Code.

## Task 1: Unify AI activity fallback chain ✅ COMPLETED

**Why Qwen:** Three activity files (`generateCopyActivity.ts`, `generateImageActivity.ts`, `generateUIActivity.ts`) share the same provider-fallback pattern with duplicated error handling, env checks, and mock fallbacks.

**What was done:**

1. Created `backend/src/activity/aiProviderChain.ts` with generic `runProviderChain<TInput, TOutput>()`
2. Refactored all three activity files to use the unified chain
3. Updated test to match new error handling behavior
4. All 43 backend tests passing

**Original prompt (kept for context):**

```
In the Loomi backend at /home/ramonancolon/loomi, refactor the three generation activities to share a common fallback utility.

1. Create `backend/src/activity/aiProviderChain.ts` with a generic `runProviderChain<TInput, TOutput>()` that:
   - Accepts an ordered list of `{ name, isAvailable: () => boolean, run: (input) => Promise<TOutput> }` providers
   - Logs warnings on provider failure and falls through to the next
   - Throws only if all providers fail and no mock fallback is supplied

2. Refactor `generateCopyActivity.ts`, `generateImageActivity.ts`, and `generateUIActivity.ts` to use this utility.
3. Keep existing `deps` exports for unit tests.
4. Do not change public activity function signatures.
5. Run `npm test` in backend and fix any failures.
```

---

## Task 2: Split Creative Studio UI into presentational components

**Why Qwen:** Mechanical file split with many small JSX blocks; low risk but tedious.

**Prompt:**

```
Split `frontend/src/components/CreativeStudioWorkspace.tsx` into focused components:

- `CampaignBriefForm.tsx` — left panel form (props: formData, onChange, onSubmit, isWorking, error)
- `AgentReasoningTerminal.tsx` — reasoning stream display
- `ApprovalPanel.tsx` — human-in-the-loop approval CTA
- `CampaignResultsPanel.tsx` — copy, image, and UI preview sections

Keep `CreativeStudioWorkspace.tsx` as the orchestrator using existing hooks (`useCampaignProgress`) and store.
Preserve all existing tests in `CreativeStudioWorkspace.test.tsx` — update imports only if needed.
Run `npm test` in frontend.
```

---

## Task 3: Improve Temporal workflow error reporting

**Why Qwen:** Requires careful Temporal API usage and test updates across workflow + API layers.

**Prompt:**

```
Improve error handling in the Loomi Temporal workflow and API:

1. In `backend/src/workflow/campaignGenerationWorkflow.ts`:
   - Capture activity failure messages in workflow state (`errorMessage`)
   - Set `workflowStatus = 'error'` without rethrowing if you want clients to read the error via query (choose one consistent approach)

2. In `backend/src/api/routes/campaignRoutes.ts`:
   - Distinguish `WorkflowNotFoundError` (404) from transient query failures (202 pending)
   - Import from `@temporalio/client` or `@temporalio/common`

3. Add/update tests in `server.test.ts` and `campaignGenerationWorkflow.test.ts`.
4. Run backend tests.
```

---

## Task 4: Shared campaign types package

**Why Qwen:** Cross-package type sync is repetitive; needs careful alignment of frontend/backend/DEPLOYMENT docs.

**Prompt:**

```
Create a shared types module to eliminate duplication between frontend and backend campaign types:

1. Add `packages/shared-types/src/campaign.ts` with CampaignRequest, WorkflowStatus, CampaignResult, AgentState
2. Update backend `src/types/campaign.ts` and frontend `src/types/campaign.ts` to re-export from shared package
3. Configure workspace in root package.json (npm workspaces or pnpm)
4. Update tsconfig paths in both apps
5. Verify both apps build and tests pass
```

---

## Task 5: Replace SSE polling with Temporal workflow signals/updates (optional enhancement)

**Why Qwen:** Architectural change requiring Temporal workflow update handlers and frontend protocol changes.

**Prompt:**

```
Replace the 1-second SSE polling in `backend/src/api/routes/campaignRoutes.ts` with Temporal workflow update subscriptions or a push-based pattern if supported in @temporalio/client 1.17.

Document the chosen approach. Update frontend `useCampaignProgress.ts` accordingly. Ensure graceful reconnect on client disconnect.
```

---

## Completed in this refactor

- Added missing Temporal worker (`backend/src/worker.ts`) and docker-compose `command`
- Fixed blocking `workflowClient.execute` → non-blocking `workflowClient.start`
- Modularized Express API (routes, middleware, validation, response builders)
- Centralized env config and CORS via `CORS_ALLOWED_ORIGINS`
- Frontend API client, SSE hook extraction, constants module
- Next.js rewrites use `BACKEND_URL` env var
- Fixed duplicate TypeScript interfaces in copy activity
