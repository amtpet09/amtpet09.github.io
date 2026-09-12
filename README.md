AMT Pet Marketplace — FINAL INCUBATOR FIX 2

Files:
- index.html — existing marketplace frontend with reliable delegated mobile incubator click handling
- server.js — existing AMT Pet Marketplace backend / incubator routes
- package.json — existing Render dependencies

Incubator fix:
- Egg selector buttons use data attributes + capture-phase click routing.
- START INCUBATOR buttons use the same reliable handler.
- 12-second timeout gives a visible error instead of hanging.
- UI shows immediate STARTING state and confirmed INCUBATOR STARTED state.
- Build marker: BUILD 2026-09-12-FIX2

Important:
- Keep Pi Testnet settings while testing.
- Do not expose issuer/distributor/personal wallet addresses in frontend.
- Do not put AMT distributor secret/private key in frontend.

16
