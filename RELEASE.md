# Release Runbook — OTA Updates (Expo)

This runbook aligns our process with Expo’s “Production Playbook for OTA Updates”.

## Branches & Channels
- `development` → dev client builds
- `preview` → internal testing channel
- `production` → public channel (staged rollouts)

## Build
1. Preview build (optional when needed):
   - `bun run build:preview` (installs to testers)
2. Production build (when native changes):
   - `bun run build:prod` (uses `--channel production`)

## Publish — Preview
1. Publish to preview and verify:
   - `bun run update:preview`
2. Validate:
   - App boots fast; update modal behavior; critical user paths

## Publish — Production (Staged Rollout)
1. Start at 10%:
   - `bun run update:prod:rollout10`
   - or interactive: `bun run channel:rollout` → choose production and %
2. Monitor (30–120 min):
   - EAS Update dashboard adoption + errors
   - Analytics (PostHog) by `ota_update_id`, `ota_runtime_version`, `ota_channel`
3. Promote to 50%/100%:
   - `bun run update:prod:edit` (select rollout and set new %)

## Rollback / Recovery
- Cancel rollout or republish last known good update:
  - `bun run update:prod:edit` → cancel rollout
  - `eas update:republish --branch production --group <good-group-id>`
- Emergency: `bun run update:rollback` (CLI wizard)

## Monitoring Keys
- PostHog super properties set on boot:
  - `ota_update_id` (or `"embedded"`)
  - `ota_runtime_version`
  - `ota_channel`

## Safety Checks
- Runtime version policy: `appVersion` in `app.config.js`
- Fast start: `updates.checkAutomatically = "ON_ERROR_RECOVERY"`, `fallbackToCacheTimeout ~ 2000ms`
- OTA-safe changes only (no native code). If unsure:
  - Compare fingerprints vs. build: `eas fingerprint:compare --build-id <ID>`

## Appendix
- Expo playbook: search “Production Playbook for OTA Updates” on expo.dev
- Rollouts docs: search “EAS Update rollouts” on docs.expo.dev

