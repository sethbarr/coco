# Coco — Feature Roadmap

*Last updated: July 26, 2026. Companion to PROJECT_BRIEF.md (current state + stumbling blocks).*

The product's spine is the **guided cycle**: prep → consent-gated summaries → briefed joint session → endorsed agreements → check-ins. Phases below finish that cycle first, then harden trust, then deepen the work.

---

## Phase 1 — Close the accountability loop ✅ *(shipped July 26, 2026)*

The wrap-up produces agreements and a check-in date; nothing yet happens when that date arrives.

- ✅ **Check-in sessions** — a joint session flavor where Coco is briefed with the active agreements and last check-in, and runs the review: *what worked / what didn't / keep, adjust, or retire* — hearing each partner in turn. Agreement statuses (kept / struggling / retired) update only here, with both present.
- ✅ **Private reflection sessions** — between check-ins, either partner can talk to Coco about how the agreements are going, in private. Coco knows the agreements and helps them decide what to bring to the next check-in.
- ✅ **Agreement lifecycle on the topic page** — status chips, proposed-changes preview on recaps, retired history. *(Still open: explicit "topic resolved" state.)*
- ✅ **In-app notifications** — live bell with unread badge; fires on invite, accept, new topic, summary approved, joint ready, check-in started, recap awaiting endorsement, plan active. *(Check-in-due shows as a banner on the topic page rather than a notification row.)*

## Phase 2 — Trust & safety *(before inviting real couples)*

- ✅ **Crisis detection & escalation** *(shipped July 28, 2026)* — regex screen on every message + Haiku classifier on hits; crisis level pauses the session with fixed reviewed wording, concern level attaches a resource card (DV resources only in individual sessions — never on a shared screen). Flags logged to SecurityEvent without message content.
- ✅ **Safety screen before first joint work** *(shipped July 28, 2026)* — 4-question private per-partner screening, once per connection; topic creation requires your own screen, joint/check-in sessions require both. Gates check completion only — outcomes are never shown to the partner; flagged users get private resources and decide for themselves whether to continue.
- **Encryption honesty** — decide: implement real E2E (heavy: key management, Coco needs plaintext to function, so likely "encrypted at rest + strict access" instead) or rename/reframe honestly. Ship TLS + at-rest encryption + a plain-language privacy page.
- **Account recovery** — pseudonymous accounts currently have no password reset path; losing a password loses the relationship history. Options: recovery codes shown at signup (fits pseudonymity) or optional email.
- **Auth polish** — surface rate-limit messages distinctly from bad credentials; session expiry UX; delete-my-account (with partner-data implications thought through).

## Phase 3 — Deepen the work

- **Exercise library** — structured exercises Coco can deploy by name in joint sessions (speaker–listener technique, appreciation rounds, repair attempts); seed ideas exist in `docs/EXAMPLE_EXERCISES.md`.
- **Coco's memory across topics** — with consent, Coco recalls patterns across a couple's topics ("this echoes what you two worked on around chores") and each partner's individual style.
- **Relationship health pulse** — lightweight periodic 3-question pulse per partner; private trendline each, shared trendline only by mutual opt-in.
- **Export & sharing** — PDF export of Our Plan; on-demand "send snapshot to Google Docs"; a printable one-pager (fridge-door mode).
- **Streaming responses** — Coco's replies stream token-by-token instead of the long typing indicator; matters most in emotional moments.
- **Mobile-friendly PWA** — the check-in habit lives on phones; responsive pass + installable PWA before native apps.

## Phase 4 — Grow up as a product

- **Multi-party beyond couples** — the schema already supports family/friend connections; prompts and flows need family-specific variants (e.g., parent–teen has different neutrality rules).
- **Therapist-adjacent mode** — export a consented topic history for a human therapist; positioning Coco as *between-sessions* support.
- **Billing** — subscriptions (per person or per connection?); free tier scoped to one topic.

## Engineering foundation (parallel track, chip away continuously)

| Item | Why it matters |
|---|---|
| Automated tests + CI (GitHub Actions) | Every feature above touches the consent gates — regressions there are trust-fatal |
| Staging environment on Railway | Stop testing prompts/migrations in production |
| Error tracking (Sentry) + uptime alerts | Today failures are only visible in Railway logs |
| Database backups | Railway snapshots on; add scheduled `pg_dump` off-platform |
| Message pagination + context windowing | Sessions grow unbounded; costs and latency creep |
| Socket reconnect + presence | Dropped connections currently just go quiet; show "partner is here" |
| Prompt eval harness | Test prompt changes against recorded scenarios before shipping them |
| Cleanup debt | Remove `@ts-ignore`s, dead debug pages (TestLogin, ApiTester, Debug), unused `claude.js`, old error-log folder |

---

## Suggested order of attack

1. ~~Check-in sessions + agreement lifecycle~~ ✅
2. ~~In-app notifications~~ ✅
3. Crisis escalation + safety screen (unlocks inviting real users)
4. Account recovery + Sentry + backups (don't lose people's data or trust)
5. Exercises, streaming, PWA (deepen)
