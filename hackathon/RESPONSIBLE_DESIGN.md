# Responsible Design Note

## Data handling

- **Approved sources:** Bloomreach hackathon sandbox / demo data only via Loomi Connect MCP and configured Engagement project URL.
- **No production customer data** in this project unless explicitly approved by organizers.
- **Campaign brief** fields (brand, goal, audience, platform) are passed to Gemini for reasoning and to generation activities after approval — teams should not enter real PII in demos.
- **OAuth tokens** stored locally at `MCP_OAUTH_STORE_PATH` (default `.mcp-oauth/session.json`); must not be committed, shared in Slack, or shown in demos.

## What the agent decides

| Step | Decision | Automated action on customers? |
|------|----------|--------------------------------|
| Reasoning | Vibe, strategy summary, evidence, copy preview | No |
| Approval gate | Human must click **Approve & Execute** | No |
| Generation | Full copy, image, HTML UI layout | No — artifacts are local/download only |

**Nothing is sent to email/SMS/push channels or written to Engagement campaigns without a future, separate integration.**

## Simulated vs executed

| Executed in demo | Simulated / not implemented |
|------------------|----------------------------|
| MCP tool calls (when OAuth + Gemini configured) | Engagement campaign publish |
| Temporal workflow + SSE progress | PayPal or payment flows |
| OAuth to Marketing/Analytics MCP | Production-scale guardrails |
| Copy/UI generation (LLM or mock chain) | Image gen may use mock if API keys missing |

## Human review

- Workflow **blocks** at `recommendation_ready` until `approveCampaign` signal.
- UI states: *Nothing is sent to customers or published to Engagement until you approve.*
- Reroll on copy preview and individual assets supports iterative review without restarting MCP reasoning.

## Safety and limitations

- Agent may still hallucinate if MCP tools return sparse data — **evidence panel** and reasoning stream are for human verification.
- `usedLiveMcp` flag distinguishes sandbox tool usage from demo heuristics.
- Rate limits on Gemini trigger labeled fallback; not silent failure.
- Maximum 12 MCP remote calls per reasoning run to avoid runaway tool loops.

## Credentials

- API keys via environment variables only.
- MCP login opens OAuth in a new window; callback returns JSON status (no tokens in frontend).

## Explainability (submission FAQ)

- **Data in:** brief + MCP tool responses.  
- **Tools called:** visible in reasoning stream.  
- **Decisions:** vibe + preview + evidence before approval.  
- **Actions:** artifact generation only after approval.  
- **Human review:** required.  
- **Limitations:** no auto-send; analytics/marketing share OAuth server in default config.
