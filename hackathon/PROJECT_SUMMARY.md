# Project Summary — Campaign Studio

## Problem

Marketing and lifecycle teams running win-back and re-engagement campaigns often have rich segment and catalog data in Bloomreach, but turning that intelligence into review-ready creative (copy, visuals, layout) still means jumping across dashboards, briefs, and design tools. The path from “who should we target?” to “here is a coherent campaign package” is slow and fragmented.

## Target user

**Marketing operations and lifecycle marketers** at brands using Bloomreach Engagement — especially teams preparing **email win-back** or **re-engagement** campaigns for defined segments (e.g. lapsed VIPs).

## Solution

**Campaign Studio** is an agentic workflow that:

1. Accepts a campaign brief (brand, goal, audience segment, platform).
2. **Reasons** using Loomi Connect MCP tools (Conversation/catalog, Marketing, and Analytics on the shared OAuth server) via Gemini automatic function calling.
3. Returns a **strategy recommendation** with cited evidence and a copy preview.
4. **Pauses for human approval** — nothing is published to customers or Engagement automatically.
5. After approval, generates **marketing copy**, a **hero visual**, and a **UI layout** artifact for download and review.

Temporal orchestrates the phases so the demo is reliable and the architecture is easy to explain.

## Bloomreach relevance

The agent’s decisions are meant to be grounded in **Bloomreach intelligence**, not generic LLM guesses: segment signals, catalog/product context, and (when OAuth is connected) marketing and analytics tools on the Loomi Connect sandbox. The workflow embodies the hackathon pattern: **understand → recommend → human review → prepare artifacts**.

## Value

- **Faster time-to-draft** for segment-aware campaigns  
- **Transparent evidence** before creative spend  
- **Safe by design** — human gate before generation and no auto-send  

## What is live vs simulated in this build

| Live | Simulated / optional |
|------|----------------------|
| MCP OAuth, tool calls in reasoning (when configured) | Demo segment heuristics if MCP or Gemini unavailable |
| Temporal workflow, approval signal, SSE progress | Image generation may use mock or external APIs per env |
| Copy/UI generation after approval | No write-back to Engagement campaigns |

## Challenge track

**T5 — Autonomous Campaign & Content Agents** (Marketing MCP + Conversations MCP; Analytics tools on the same OAuth MCP server).
