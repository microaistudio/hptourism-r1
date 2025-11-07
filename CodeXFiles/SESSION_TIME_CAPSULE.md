# RC3 Time Capsule – Nov 3, 2025

This doc captures the current state of the HP Tourism RC3 stack so the next chat session can pick up right away.

## Environment & Deployment
- Repo: `~/Projects/hptourism-rc3`
- Running via PM2 (`sudo pm2 restart hptourism-rc3 --update-env`); only the root-managed PM2 daemon should stay active.
- Test mode payments forced through PM2 env: `HIMKOSH_TEST_MODE=true`, `HIMKOSH_FORCE_TEST_MODE=true` → gateway always receives ₹1.
- HimKosh key lives at `server/himkosh/echallan.key` (IV = key). Checksum logic uses UTF-8 lowercase MD5 over the full pipe string.

## HimKosh Flow Status
- Initiation endpoint `/api/himkosh/initiate` builds the payload (no duplicate head rows, secondary head only when configured).
- GET handler on `/api/himkosh/callback` serves a holding page; POST handler decrypts and updates transactions.
- Cancellation endpoint `/api/himkosh/application/:applicationId/reset` lets DA/DTDO/owners cancel stuck attempts.
- Frontend payment wizard shows status cards, refresh, cancel button, and test-mode notice.

## Officer Search
- New `POST /api/applications/search` supports filters: application #, mobile, Aadhaar, month/year, custom date range. District-level roles are automatically scoped.
- Shared React page `client/src/pages/officer-application-search.tsx` reused by DA & DTDO navigation via `/da/search` and `/dtdo/search`.

## Navigation
- Sidebar (DA/DTDO) now includes “Search Application”.

## Outstanding Ideas / Next Steps
- Complete callback-driven payment confirmation and certificate unlock flow once treasury integration moves past ₹1 tests.
- Continue tightening guardrails on owner application wizard (additional smart inputs across steps 3+).
- Build reporting for returned applications and document versioning.
- Update PM2 to run under non-root user long term (currently root-managed; watch for dual daemons).

Keep this file updated as RC3 evolves. It will be the hand-off context for future sessions.
