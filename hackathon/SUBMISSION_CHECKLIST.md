# Final Submission Checklist

Deadline: **June 2, 2026, 4:00 PM PST** (per welcome kit)

## Phase 3 — Before you submit

### Required artifacts

- [ ] **Project summary** — `hackathon/PROJECT_SUMMARY.md` (≤500 words; paste or PDF)
- [ ] **Demo video** — 5–6 min, follows `hackathon/DEMO_SCRIPT.md`
- [ ] **Architecture** — `hackathon/ARCHITECTURE.md` (+ optional PNG export)
- [ ] **Team details** — `hackathon/TEAM_DETAILS.md` completed
- [ ] **MCP usage** — `hackathon/MCP_USAGE.md`
- [ ] **Responsible design** — `hackathon/RESPONSIBLE_DESIGN.md`
- [ ] **Future roadmap** — `hackathon/FUTURE_ROADMAP.md`
- [ ] **Code repo** — public/accessible with README setup steps

### Demo quality gates

- [ ] MCP OAuth completed; banner shows **Bloomreach MCP ready**
- [ ] `GEMINI_API_KEY` set on backend
- [ ] Reasoning stream shows **`MCP tool call:`** lines in recorded video
- [ ] **Evidence cited** visible on approval panel
- [ ] Human approval narrated; artifacts generated after approve
- [ ] Stated what is **simulated** (no Engagement publish, image provider)

### Link verification

- [ ] Video plays in incognito / logged-out browser
- [ ] Repo clone + `DEPLOYMENT.md` steps work on a clean machine
- [ ] No API keys, tokens, or `.mcp-oauth` files in repo or video

### Portal

- [ ] Submission form from organizers completed
- [ ] Confirmation received

## Quick pre-record command sanity

```bash
# Backend + worker (separate terminals)
cd backend && npm run dev
cd backend && npm run dev:worker

# Frontend
cd frontend && npm run dev
```

Open Campaign Studio → sign in MCP → run pre-filled Pacific Apparel brief.
