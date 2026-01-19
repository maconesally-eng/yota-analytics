# Yota Analytics — gemini.md

> Single source of truth for the Yota Analytics project.
> Last updated: 2026-01-19T08:04:25-05:00

---

## 1. Project State

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Initialization | ✅ Complete | gemini.md created |
| Phase 1.1: Discovery Questions | ✅ Complete | All 5 questions answered |
| Phase 1.2: Data Schema | ✅ Complete | Schema approved |
| Phase 2: Link (API Connection) | ✅ Complete | .env configured, venv created |
| Phase 3: Architect (A.N.T.) | ✅ Complete | All tools built |
| Phase 4: Stylize (UI) | ✅ Complete | Dashboard ready |
| Phase 5: Trigger (Deploy) | ✅ Complete | Real data validated |

---

## 2. Discovery Answers (✅ COMPLETE)

| # | Question | Answer |
|---|----------|--------|
| 1 | North Star: What single outcome matters most? | **D) Insight** — understanding what works, actionable feedback |
| 2 | Integrations: Only YouTube? | **Yes** — No Slack, email, Chrome Store APIs, or third-party tools |
| 3 | Source of Truth: YouTube Data API v3? | **Yes** — Sole primary data source |
| 4 | Delivery Payload: Where must analytics appear? | **A) Local dashboard + B) JSON + C) CSV** (no Chrome extension tonight) |
| 5 | Behavioral Rules: Tone confirmation? | **Yes** — Supportive, clean, non-technical. No jargon, no scare metrics |

### Guiding Voice
> "You're building this together — here's how you're growing."

---

## 3. API Configuration

```
YOUTUBE_API_KEY: [CONFIGURED IN .env]
API Version: YouTube Data API v3
Base URL: https://www.googleapis.com/youtube/v3/
```

### Known Rate Limits
- **Quota**: 10,000 units/day (default)
- **Channels.list**: 1 unit per call
- **Search.list**: 100 units per call
- **Videos.list**: 1 unit per call
- **PlaylistItems.list**: 1 unit per call

---

## 4. Data Schema (PENDING APPROVAL)

### Input Schema
```json
{
  "channel_id": "string",
  "date_range": "last_28_days",
  "api_key": "env"
}
```

### Output Schema
```json
{
  "channel": {
    "name": "string",
    "subscribers": "number",
    "views": "number",
    "uploads": "number"
  },
  "performance": {
    "views_delta": "number",
    "subscriber_delta": "number",
    "avg_views_per_video": "number"
  },
  "team_insights": {
    "best_upload_day": "string",
    "momentum_score": "number"
  }
}
```

**Schema Status**: ❌ NOT APPROVED — Awaiting discovery answers

---

## 5. Error Learnings

| Date | Error | Root Cause | Fix Applied |
|------|-------|------------|-------------|
| — | — | — | — |

---

## 6. System Rules (HARD CONSTRAINTS)

1. ❌ No competitor spying
2. ✅ Only first-party channel data
3. ✅ Readable metrics > vanity metrics
4. ✅ Optimized for shared ownership (2+ creators)
5. ✅ Safe for family & kid-friendly channels

---

## 7. Competitive Differentiation

| Competitor | Their Focus | Yota Difference |
|------------|-------------|-----------------|
| vidIQ | SEO + AI, individual | Team-based, simpler |
| TubeBuddy | Power tools, complex | Clean, emotional |
| Social Blade | Public stats, read-only | First-party, actionable |
| Viewstats | Viral ideation | Growth together, no spying |

---

## 8. Tonight's Deliverables

- [ ] Live YouTube analytics (real data)
- [ ] Core metrics loading via API
- [ ] Usable without Chrome Store approval
- [ ] No placeholder/mocked data

---

*HALT: No scripts until discovery questions are answered and schema is approved.*
