# Professional Demo Script (5–6 minutes)

Adapt team name and repo URL before recording.

---

## 0:00–0:30 — Executive context

> Hi, we are Team **[Your Team Name]**, and we built **Campaign Studio** for **marketing operations and lifecycle marketers** at Bloomreach customers.
>
> Today, these users struggle to turn **segment and catalog intelligence** into **review-ready win-back creative** without switching between Engagement, analytics, and design tools.
>
> Our agent **reasons over Loomi Connect MCP tools**, **recommends a strategy with evidence**, and **waits for human approval** before generating copy, a hero image, and a UI layout.

## 0:30–1:30 — Solution overview

> Campaign Studio is a web app backed by **Temporal** and an **Express API**.
>
> Phase one connects **Conversation**, **Marketing**, and **Analytics** MCP surfaces — Marketing and Analytics use **OAuth** you complete once from the banner.
>
> Phase two is a **human approval gate** — we never auto-send to customers.
>
> Phase three generates **downloadable artifacts** for stakeholder review.

*[Show homepage + green MCP banner if connected]*

## 1:30–2:30 — Architecture walkthrough

> User brief goes to the API, which starts a Temporal workflow.
>
> The **reasoning activity** runs Gemini with **automatic MCP function calling** — you’ll see tool names in the reasoning stream.
>
> The workflow pauses until the marketer approves, then runs three generation activities.
>
> Progress streams over **SSE** to the UI.

*[Optional: show `hackathon/ARCHITECTURE.md` diagram for 20 seconds]*

## 2:30–4:30 — Core demo

1. Point to pre-filled brief: **Pacific Apparel**, win-back goal, **Lapsed VIPs**, email.
2. Click **Generate Campaign**.
3. Narrate reasoning stream:
   - `MCP tool call:` / `MCP tool result:` lines
   - **Evidence cited** bullets (segment, catalog, or metrics)
4. Read one-line strategy summary from the stream.
5. Show **copy preview** in the approval panel.
6. Say: *“Nothing is published until I approve.”*
7. Click **Approve & Execute Strategy**.
8. Walk through **copy**, **visual**, and **UI layout**; mention download/reroll.

## 4:30–5:15 — MCP and agent reasoning

> **Loomi Connect** is not decorative — the strategist prompt **requires** catalog, marketing, and analytics tool usage when OAuth is connected.
>
> The agent **understands** sandbox signals, **decides** on vibe and messaging direction, and **prepares** artifacts only after we approve.
>
> If MCP is offline, the UI warns and `usedLiveMcp` is false — we’re transparent about demo fallback.

## 5:15–6:00 — Production and close

> To productionize: push approved briefs into **Engagement campaigns**, add audit logging, role-based OAuth, and close the loop with **Analytics** on send performance.
>
> The value is **faster, evidence-backed campaign drafts** grounded in Bloomreach intelligence, with **trust and human control** built in.
>
> Thank you.

---

## Backup if live MCP fails

- Show `MCP tool call` recording from a prior successful run, or
- State clearly: “This run is on demo fallback; our submitted video shows live MCP.”
- Do not wait until deadline day to test OAuth.
