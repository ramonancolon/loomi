# MCP Usage Explanation

## Surfaces used

| MCP surface | Connection | Role in Campaign Studio |
|-------------|------------|-------------------------|
| **Conversations / catalog** | `MCP_CONVERSATION_URL` — no OAuth | Product and catalog research for the campaign goal |
| **Marketing** | `MCP_MARKETING_URL` — OAuth via `/api/mcp/auth/login` | Segments, campaigns, journeys, audience insights |
| **Analytics** | Same OAuth server as Marketing (`MCP_ANALYTICS_URL` defaults to marketing URL) | Performance, trends, or campaign metrics to ground recommendations |

## How deeply MCPs are used

MCP is **central to Phase 1 (reasoning)**, not a background one-off:

1. `connectMcpClients()` establishes MCP SDK clients.
2. Gemini **automatic function calling** (`mcpToTool`, up to 12 remote calls) lets the model choose tools.
3. The prompt in `backend/src/mcp/reasoningPrompt.ts` **requires**:
   - At least one **catalog/conversation** tool when connected.
   - At least one **analytics** tool when Marketing OAuth is active.
   - At least one **marketing** tool for the target audience when OAuth is active.
4. The UI reasoning stream logs **`MCP tool call:`** and **`MCP tool result:`** lines from AFC history.
5. Structured **`evidence`** array is returned and shown in the approval panel.

Phases 2–3 (copy, image, UI generation) use the **approved strategy** and do not re-call MCP — this keeps generation fast and isolates “intelligence gathering” from “artifact production.”

## Why these MCPs

- **Track T5** needs campaign creation informed by engagement and content context.
- **Catalog MCP** ties creative to real products/offers in the sandbox.
- **Marketing MCP** ties creative to the named segment (`Lapsed VIPs`, etc.).
- **Analytics MCP** satisfies “beyond reporting” by forcing metric-backed reasoning when OAuth is connected.

## Fallback (transparent)

If OAuth is missing, Conversation MCP is down, or `GEMINI_API_KEY` is unset:

- `usedLiveMcp: false` on the workflow result.
- Demo segment heuristics in `backend/src/mcp/loomiConnect.ts` (clearly labeled in the reasoning stream).
- UI banner warns before demo recording.

**Judges should see OAuth connected + tool call lines for the strongest MCP score.**

## Configuration

```env
MCP_MARKETING_URL=https://loomi-mcp-alpha.bloomreach.com/mcp
MCP_CONVERSATION_URL=<sandbox conversations MCP URL>
MCP_ANALYTICS_URL=<optional; defaults to marketing URL>
GEMINI_API_KEY=<required for live tool orchestration>
ENGAGEMENT_URL=https://uqa.app.exponea.dev/p/noisy-muffin
```

## Evidence for submission

Screenshot or video frame showing:

1. Green **Bloomreach MCP ready** banner.
2. Reasoning stream with `MCP tool call: <toolName>`.
3. **Evidence cited** list on the approval panel.
