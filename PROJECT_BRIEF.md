# Coco Counseling — Project Brief

*Last updated: July 26, 2026*

## What it is

Coco is an AI relationship-counseling platform. Positioned as a **"mutual friend," not a therapist**, it helps couples (or family/friends) work through specific issues with a mix of private and shared conversations, powered by Claude.

The core idea: **each partner prepares privately, consents to what gets shared, then works through it together** — with Coco briefed on both perspectives and facilitating.

## How the guided flow works

1. **Topic** — partners name one issue to work on (*"How we talk about money"*).
2. **Private prep** — each partner talks it through with Coco alone: what happens → the feelings underneath → what they need → what a good outcome looks like.
3. **Consent gate** — Coco drafts a short *shared summary*; the partner edits and explicitly approves it. **Only the approved summary is ever shared** — never the prep conversation. Edits revoke approval and are visible to the partner.
4. **Joint session** — unlocks only when both summaries are approved. Coco opens with the common ground it sees in the two summaries and facilitates step by step, aiming at small concrete agreements.

## What works today (local dev)

- Sign-up/login (pseudonymous accounts), partner invitations and connections
- Individual chat with Coco, and live joint sessions (both partners + Coco, real-time via WebSockets)
- The full guided topic flow above, end-to-end tested
- Claude integration on a current model (`claude-sonnet-5`) with distinct prompts for individual, prep, and joint/briefed sessions

## Next steps

| Priority | What | Why |
|---|---|---|
| 1 | **Agreements & accountability** — endorse-able agreements out of joint sessions; private reflection sessions; scheduled joint check-ins (what worked / what didn't / keep-adjust-retire) | Turns one good conversation into an ongoing practice — the product's real value |
| 2 | **Safety & crisis handling** — detection and escalation beyond prompt instructions (abuse, crisis → resources, session pause) | Non-negotiable before real users; also standard practice before enabling joint work |
| 3 | **Notifications** — in-app first ("partner approved their summary", "check-in due"), email later | The two-person flow stalls without nudges |
| 4 | **Deployment** — new hosted database, hosting, real secrets management | Everything currently runs on a laptop |
| 5 | **Real end-to-end encryption** — the scaffolding exists but messages are effectively plaintext server-side | Privacy promise should match the marketing before launch |

## Stumbling blocks (honest list)

- **No hosted database.** Both previous Supabase projects were deleted; dev runs on local Postgres. Blocker for anyone else testing remotely.
- **Encryption is cosmetic.** Fields are named `encryptedContent` but store plaintext. Fine for prototyping; must be resolved (or honestly de-scoped) before real users.
- **Safety is prompt-only.** Coco is instructed to recommend professional help, but nothing detects or escalates crisis situations programmatically.
- **Two-person coordination friction.** Without notifications, a partner doesn't know they've been invited to a topic or that a joint session is ready.
- **Single-developer bus factor.** One environment, no CI, no staging.

## Want more detail?

- `docs/PROJECT_OVERVIEW.md` — architecture, security model, testing strategy
- `docs/CLAUDE_PROMPT_DESIGN.md` — how Coco's prompts are constructed
- `docs/EXAMPLE_EXERCISES.md` — exercise ideas for future guided work
- `README.md` — stack, setup, and how to run locally
- Git history — each feature landed as a documented commit
