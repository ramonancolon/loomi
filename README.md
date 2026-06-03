# Campaign Studio (Loomi)

**Team FBB** · [Loomi Connect AI Hackathon](https://github.com/ramonancolon/loomi/tree/main/hackathon) · Track **T5 — Autonomous Campaign & Content Agents**

Campaign Studio turns a marketing brief into a review-ready campaign package: MCP-grounded strategy, human approval, then generated copy, hero image, and UI layout. Built with **Bloomreach Loomi Connect MCP**, **Temporal**, and **Google Gemini**.

## What it does

1. **Brief** — Brand, goal, audience segment, platform (e.g. win-back email for lapsed VIPs).
2. **Reason** — Gemini orchestrates Loomi Connect tools (Conversations/catalog, Marketing, Analytics via OAuth).
3. **Recommend** — Strategy, cited evidence, and copy preview; workflow waits for approval.
4. **Generate** — After you approve: structured copy, visual, and downloadable UI artifact.

Nothing is auto-published to Bloomreach Engagement or sent to customers.

## Architecture

```
Browser (Next.js) → Express API → Temporal workflow
                         ↓              ↓
                    MCP OAuth      Worker + activities
                    (Bloomreach)   (reasoning, copy, image, UI)
```

Details: [`hackathon/ARCHITECTURE.md`](./hackathon/ARCHITECTURE.md)

## Prerequisites

- **Node.js** 18+ and npm
- **Temporal** — [Temporal Cloud](https://cloud.temporal.io) (recommended) or local Temporal via Docker
- **GEMINI_API_KEY** — required for live MCP reasoning
- **Bloomreach MCP** — sign in from the UI (Marketing & Analytics OAuth)

## Local development

### 1. Clone and configure

```bash
git clone https://github.com/ramonancolon/loomi.git
cd loomi

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:

- `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_API_KEY` (Temporal Cloud)
- `GEMINI_API_KEY`
- Defaults for local OAuth: `MCP_OAUTH_REDIRECT_URL=http://localhost:3001/api/mcp/auth/callback`, `FRONTEND_URL=http://localhost:3000`

### 2. Install dependencies

```bash
cd backend && npm install && npm run build
cd ../frontend && npm install
```

### 3. Run (three terminals)

```bash
# Terminal 1 — API (port 3001)
cd backend && npm run dev

# Terminal 2 — Temporal worker (required for workflows)
cd backend && npm run dev:worker

# Terminal 3 — UI (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000** → **Sign in to Marketing & Analytics MCP** → run a campaign → approve when ready.

### 4. Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Project layout

| Path | Description |
|------|-------------|
| `frontend/` | Next.js Campaign Studio UI |
| `backend/` | Express API, Temporal worker, MCP + Gemini activities |
| `hackathon/` | Submission docs (summary, demo script, checklist) |
| `DEPLOYMENT.md` | Docker Compose and environment reference |
| `AWS_DEPLOYMENT.md` | EC2 + Temporal Cloud deployment |
| `SETUP_AWS_TEMPORAL.md` | Step-by-step AWS and Temporal setup |

## Deployment

- **Docker (local stack):** `docker-compose.yml` — see [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **EC2 + Temporal Cloud:** `docker-compose.ec2.yml` — see [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md)

## Hackathon submission

| Document | Purpose |
|----------|---------|
| [`hackathon/PROJECT_SUMMARY.md`](./hackathon/PROJECT_SUMMARY.md) | Problem, solution, value |
| [`hackathon/DEMO_SCRIPT.md`](./hackathon/DEMO_SCRIPT.md) | 5–6 minute demo outline |
| [`hackathon/MCP_USAGE.md`](./hackathon/MCP_USAGE.md) | MCP surfaces and depth |
| [`hackathon/SUBMISSION_CHECKLIST.md`](./hackathon/SUBMISSION_CHECKLIST.md) | Pre-submit checklist |
| [`hackathon/TEAM_DETAILS.md`](./hackathon/TEAM_DETAILS.md) | Team FBB roster and links |

## License

ISC (see package metadata in `backend/package.json`).
