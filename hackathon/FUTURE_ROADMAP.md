# Future Roadmap

## Near term (post-hackathon)

1. **Engagement write-back** — Create or update draft campaigns/journeys in sandbox after approval, still behind a second human confirm.
2. **Dedicated Analytics MCP endpoint** — If organizers expose a separate analytics URL, connect without sharing the marketing client.
3. **Tool call audit log** — Persist MCP request/response metadata for compliance review (redacted).
4. **Stronger schema validation** — Enforce JSON strategy shape from Gemini with retry before fallback.

## Medium term

1. **Performance loop** — After send, Analytics MCP informs reroll suggestions (“subject line underperformed vs cohort”).
2. **Multi-channel packages** — Parallel artifacts for email, push, and landing page from one brief.
3. **Role-based access** — Map OAuth to workspace roles; read-only vs draft-create scopes.
4. **Hosted deployment** — Cloud Run or ECS with secrets manager; remove local OAuth file store.

## Long term

1. **Cross-MCP orchestration (T6-style)** — Churn signal from analytics → segment selection in marketing → conversational surface activation.
2. **PayPal-aware offers** — Payment-aware incentives for high-intent segments (Track 5 optional partner).
3. **Feedback learning** — Marketer approvals/rejections tune vibe and copy patterns per brand.

## Production hardening checklist

- [ ] Rate limits and circuit breakers on MCP and LLM calls  
- [ ] PII detection on brief fields  
- [ ] SOC2-friendly logging (no raw tokens)  
- [ ] Integration tests against sandbox MCP with recorded fixtures  
- [ ] SLA monitoring on Temporal workflow duration  
