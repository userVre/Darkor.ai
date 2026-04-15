# ARCHITECTURE.md

## Purpose
This file is the "mental map" for future AI agents working in this repo.

The app is an Expo + Expo Router mobile product for **HomeDecor AI**. It lets users upload a photo, choose a design direction, and generate AI redesigns for:

- Interior redesign
- Exterior / facade redesign
- Garden redesign
- Smart wall paint
- Floor restyle

The current backend is **Convex**. The core generation pipeline uses **Gemini + Nano Banana**. Billing and subscription state are handled through **RevenueCat** and then mirrored into Convex user records.

Important brand note:
- The live product name is **HomeDecor AI**
- Some storage keys, pricing attributes, and legacy identifiers still use **`darkor`** names
- Do not assume `darkor` means a separate product; in this repo it is mostly legacy naming

## Stack At A Glance
- Frontend: Expo, React Native, Expo Router
- Auth: Clerk
- Backend/database/storage/jobs: Convex
- AI models:
  - Gemini 3.1 prompt optimization
  - Gemini mask detection
  - Nano Banana image generation
- Billing: RevenueCat
- Styling:
  - `Inter` font loaded globally
  - custom design system in `lib/design-system.ts`
  - theme tokens in `styles/`

## Folder Structure Summary

### `/app`
Expo Router routes and screen composition.

- `app/_layout.tsx`
  - Global app shell
  - Loads fonts
  - Applies global left-aligned text defaults
  - Mounts Clerk, Convex, session, credits, draft, RevenueCat sync, i18n
- `app/index.tsx`
  - Launch gate
  - Redirects into tabs or paywall
- `app/(tabs)/index.tsx`
  - Home / tools screen
- `app/(tabs)/workspace.tsx`
  - Main creation flow
  - Houses the 4-step redesign wizard, board, editor, regenerate flow
  - This is the most important frontend file for the general redesign flow
- `app/(tabs)/gallery.tsx`
  - Discover / inspiration experience
- `app/(tabs)/profile.tsx`
  - Profile/account area
- `app/paywall.tsx`
  - Subscription purchase UI
- `app/settings.tsx`
  - Settings, restore purchases, language, legal links
- `app/sign-in.tsx`, `app/sign-up.tsx`
  - Auth entry points
- `app/legal-viewer.tsx`, `app/privacy-policy.tsx`, `app/terms-of-service.tsx`, `app/faq.tsx`
  - Legal/support content
- `app/wizard.tsx`
  - Alias to the workspace route

### `/components`
Reusable UI and specialized flow components.

- General shell/context:
  - `viewer-session-context.tsx`
  - `viewer-credits-context.tsx`
  - `workspace-context.tsx`
  - `flow-ui-context.tsx`
  - `pro-success-context.tsx`
- Main redesign steps:
  - `interior-redesign-step-one.tsx`
  - `interior-redesign-step-two.tsx`
  - `interior-redesign-step-three.tsx`
  - `interior-redesign-step-four.tsx`
  - matching exterior/garden step files
- Specialized service flows:
  - `paint-wizard.tsx`
  - `floor-wizard.tsx`
- Shared design primitives:
  - `design-step-header.tsx`
  - `design-wizard-primitives.tsx`
  - `service-wizard-header.tsx`
  - `service-wizard-shared.tsx`
  - `sticky-step-header.tsx`
- Brand-specific custom visuals:
  - `architectural-mode-icons.tsx`
  - `diamond-credit-pill.tsx`
  - `material-icons.tsx`

### `/convex`
Backend logic, database schema, AI actions, and RevenueCat webhook handling.

- `schema.ts`
  - Tables: `users`, `generations`, `projects`, `feedback`
- `viewer.ts`
  - Guest/account viewer resolution
  - guest user creation
  - default user fields
- `users.ts`
  - user state
  - subscription sync
  - refill reward logic
  - review prompt logic
- `subscriptions.ts`
  - free vs weekly vs yearly quota logic
  - reset windows and access decisions
- `generations.ts`
  - upload URL creation
  - generation reservation
  - generation record creation
  - refund/release on failure/cancel
- `ai.ts`
  - prompt building
  - Gemini prompt optimization
  - Gemini mask detection
  - Nano Banana image generation
- `http.ts`
  - RevenueCat webhook endpoint

### `/lib`
Frontend business logic, data catalogs, helpers, and service integrations.

- `design-system.ts`
  - shared colors, radii, typography, shadows
- `data.ts`
  - wall colors, floor materials, discover presets
- `discover-data.ts`
  - discover sections and preset mapping
- `service-wizard-theme.ts`
  - shared service wizard visual tokens
- `revenuecat.ts`
  - RevenueCat client config and entitlement parsing
- `dynamic-pricing.ts`
  - country-tier pricing model
  - RevenueCat offering hints/attributes
- `generation-access.ts`
  - cached generation eligibility state
- `generation-errors.ts`, `generation-retry.ts`, `generation-status.ts`
  - generation UX helpers
- `native-upload.ts`
  - upload local files into Convex storage
- `api.ts`
  - legacy direct API helper; appears unused by the current app flow

### `/styles`
Global theme primitives.

- `theme.ts`
  - color palette and brand tokens
- `typography.ts`
  - exported Inter-based text styles
- `spacing.ts`
  - spacing scale

### `/assets`
Static media.

- Fonts in `assets/Fonts/`
- discover references, presets, before/after examples, videos, logos
- this repo stores a large amount of design inspiration and preset imagery here

### `/locales`
i18n JSON dictionaries.

### `/scripts`
Mostly asset-processing helpers for discover media.

### `/plugins`
Expo/native build plugin customization.

### `/android`
Native Android project generated for Expo prebuild/dev client usage.

## Route + State Mental Model

1. The app boots through `app/_layout.tsx`.
2. `ViewerSessionProvider` ensures every session has an anonymous ID, even before auth.
3. Convex `users:getOrCreateCurrentUser` makes sure a guest or signed-in viewer exists.
4. `ViewerCreditsProvider` keeps credits/subscription state available globally, including optimistic updates.
5. `WorkspaceDraftProvider` persists in-progress wizard state to AsyncStorage.
6. The main creation UX lives in `app/(tabs)/workspace.tsx`.

If you need to understand "how a user gets from photo to result", start here:

- frontend orchestration: `app/(tabs)/workspace.tsx`
- backend reservation and generation row creation: `convex/generations.ts`
- actual model calls: `convex/ai.ts`

## Core Generation Logic

There are two related but different flows:

### A. Main 4-step redesign flow
Used for interior, exterior, and garden redesign inside `app/(tabs)/workspace.tsx`.

Step 1. Photo intake
- User uploads, takes, or selects an example image
- Draft image is saved in `WorkspaceDraftProvider`

Step 2. Space selection
- Interior: choose room type
- Exterior: choose building type
- Garden: infer or choose garden area

Step 3. Style selection
- User picks the style direction
- This becomes the visual/style input for the backend prompt

Step 4. Refine + generate
- Interior: choose `modeId` and `paletteId`
  - mode = preserve vs renovate
  - palette = tonal family
- Exterior/Garden: palette selection is the final refinement step
- Then `handleGenerate()` uploads the source image, creates a generation, and transitions into processing/result

Important mapping:
- For these redesign services, frontend `serviceType` becomes backend `serviceType: "redesign"`
- The saved generation record still stores additional UI metadata like `modeId`, `paletteId`, `finishId`, `aspectRatio`, `customPrompt`

### B. Specialized paint/floor flows
These are separate wizard components, not the main 4-step redesign wizard.

Paint flow:
1. Intake photo
2. Create/edit wall mask
3. Choose color and target surface
4. Choose finish and generate

Floor flow:
1. Intake photo
2. Create/edit floor mask and add custom prompt
3. Choose material and generate

Both paint and floor use the same backend `startGeneration`, but send:
- `serviceType: "paint"` or `serviceType: "floor"`
- a required mask image
- extra fields such as `targetColor`, `targetSurface`, or material prompt text

## Backend Generation Pipeline

This is the actual end-to-end generation chain.

Step 1. Client gathers inputs
- Frontend selects service metadata, prompt inputs, aspect ratio, and image(s)
- `paint-wizard.tsx` and `floor-wizard.tsx` can auto-detect masks using `ai:detectEditMask`

Step 2. Client uploads source assets
- Local image (and mask when required) is uploaded to Convex storage
- Upload URL comes from `generations:createSourceUploadUrl`

Step 3. Convex reserves usage and creates a generation row
- `generations:startGeneration`
- checks access
- decrements free credits or increments paid usage counter
- creates a `generations` record with `status: "processing"`
- schedules `internal.ai.generateDesign`

Step 4. AI action executes
- `convex/ai.ts -> generateDesign`
- builds draft prompt
- uses **Gemini 3.1** (`GEMINI_TEXT_MODEL`, default `gemini-3.1-pro-preview`) to optimize the final prompt
- uses **Nano Banana** for the actual image generation
  - standard: `gemini-2.5-flash-image`
  - paid/pro tiers can resolve to `nano-banana-pro-preview`
- stores the output in Convex storage
- patches the generation row to `ready`
- on failure, marks failed and refunds/releases allowance

## API Integrations

### Gemini 3.1
Owned in `convex/ai.ts`.

Used for:
- prompt optimization before image generation
- turning high-level user selections into a stronger architectural render prompt

Defaults:
- text optimizer model: `gemini-3.1-pro-preview`
- detection model: `gemini-2.5-flash`

### Nano Banana
Also owned in `convex/ai.ts`.

Used for:
- final image generation from the optimized prompt
- can receive source image + mask + structured generation context

Model routing:
- standard users: `gemini-2.5-flash-image`
- higher speed/quality tiers: `nano-banana-pro-preview`

### RevenueCat
Frontend client wrapper:
- `lib/revenuecat.ts`

Boot-time sync:
- `app/_layout.tsx` via `RevenueCatGate`

Server persistence:
- `convex/users.ts`

Webhook endpoint:
- `convex/http.ts` at `/webhooks/revenuecat`

What it does:
- resolves active entitlement
- maps weekly/yearly purchases into Convex plan fields
- keeps app-side access and backend-side quotas aligned

## Credit / Refill System

### What the code actually does
- Free tier cap is **3 Diamonds**
- New guest/account users start with **3 credits**
- Free generations consume 1 Diamond
- Paid users do not spend Diamonds; they use weekly/monthly quota counters instead

### Refill logic
Implemented in:
- `convex/users.ts -> claimThreeDayReward`
- `lib/rewards.ts`

Current backend behavior:
- reward window = **72 hours**
- reward amount = **+1 Diamond**
- cap = **3 total Diamonds**
- free-plan only

Important clarification:
- The phrase "3 Diamonds every 72h" is good product shorthand, but the **current code does not grant +3 every 72h**
- The code grants **1 Diamond every 72h**, up to the 3-Diamond free cap

### Paid quotas
Defined in `convex/subscriptions.ts`:
- free: `3`
- weekly: `20`
- yearly: `80` per monthly reset window

## Branding & Design Rules

Treat these as the intended design contract for future work.

### Non-negotiables
- Brand name: **HomeDecor AI**
- Primary typeface: **Inter**
- Text alignment: **left-aligned by default**
- Core look: editorial, architectural, calm, premium
- Avoid flashy generic AI aesthetics
- Prefer flat surfaces and refined shadows over loud gradients

### Source of truth
- Global font loading: `app/_layout.tsx`
- localized font helpers: `lib/i18n/language.ts`
- design tokens: `lib/design-system.ts`
- colors: `styles/theme.ts`
- service wizard theme: `lib/service-wizard-theme.ts`

### Left alignment rule
`app/_layout.tsx` explicitly applies:
- `Text.defaultProps.style = [localizedFonts.regular, { textAlign: "left" }]`
- `TextInput.defaultProps.style = [localizedFonts.regular, { textAlign: "left" }]`

That means left alignment is not just a preference; it is a global default.

### No gradients rule
For new branded UI, future agents should prefer:
- solid backgrounds
- neutral surfaces
- brand-accent shadows
- subtle depth

Important exception:
- the repo still contains some `LinearGradient` usage in older/marketing-heavy areas like home, paywall, diamond visuals, and some finish previews
- do not treat those legacy gradients as the preferred design language for new screens

## Legal Differentiation Rules

Future agents should preserve the app's distinct visual identity and avoid generic competitor-like UI.

### Signature shapes
Important files:
- `components/design-wizard-primitives.tsx`
- `lib/design-system.ts`

Patterns already used:
- asymmetric "architectural" card radii via `getArchitecturalSelectionRadii()`
  - top-left/bottom-left differ from top-right/bottom-right
- "organic" radii in the broader design system
- pill-heavy controls for actions/credits

Practical rule:
- prefer signature asymmetry and architectural contours over generic perfectly rounded cards

### Unique icons
Important files:
- `components/architectural-mode-icons.tsx`
- `components/material-icons.tsx`
- `components/diamond-credit-pill.tsx`
- `components/design-wizard-primitives.tsx`

Already differentiated elements:
- custom architectural mode icons (`StructuralDraftIcon`, `RenovationSparkIcon`)
- custom diamond/credit icon SVG
- wrapped icon system instead of raw stock usage everywhere
- room/building icon mapping tied to the wizard flow

Practical rule:
- if adding a new core feature, prefer extending the custom icon language instead of dropping in arbitrary stock icons
- keep the brand feeling architectural, not generic SaaS/mobile-template

## Data Model Snapshot

### `users`
Tracks:
- guest/account identity
- credits
- plan
- subscription type and entitlement
- generation counts
- refill timestamp
- referral metadata

### `generations`
Tracks:
- source storage IDs
- mask storage ID
- output storage ID / URL
- service type
- style/room/palette/mode/finish metadata
- prompt
- plan used
- generation status
- feedback / project linkage

### `projects`
Saved groupings for generations.

### `feedback`
Freeform user feedback records.

## Important Gotchas For Future Agents

- The real backend generation path is **Convex**, not `lib/api.ts`
- `lib/api.ts` looks legacy and currently has no repo usage
- Brand is **HomeDecor AI**, but several storage keys and pricing attributes still say `darkor`
- The free refill implementation is **+1 every 72h capped at 3**, not literal "+3 every 72h"
- `app/(tabs)/workspace.tsx` is very large and acts as:
  - wizard controller
  - board controller
  - editor controller
  - regenerate controller
- When debugging access issues, inspect all of:
  - `components/viewer-session-context.tsx`
  - `components/viewer-credits-context.tsx`
  - `lib/generation-access.ts`
  - `convex/users.ts`
  - `convex/subscriptions.ts`

## Where To Start Depending On Task

- New redesign flow behavior:
  - `app/(tabs)/workspace.tsx`
  - `convex/generations.ts`
  - `convex/ai.ts`
- Paint/floor generation bugs:
  - `components/paint-wizard.tsx`
  - `components/floor-wizard.tsx`
  - `convex/ai.ts`
- Subscription/paywall issues:
  - `app/paywall.tsx`
  - `lib/revenuecat.ts`
  - `convex/http.ts`
  - `convex/users.ts`
  - `convex/subscriptions.ts`
- Brand/design updates:
  - `lib/design-system.ts`
  - `lib/service-wizard-theme.ts`
  - `styles/theme.ts`
  - `components/design-wizard-primitives.tsx`

