# Darkor.ai Mobile (Expo)

This repo contains the Expo React Native app for Darkor.ai.

## Setup
1. `npm install`
2. Create a `.env` file in the repo root with:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=`
   - `EXPO_PUBLIC_CONVEX_URL=`
   - `EXPO_PUBLIC_API_BASE_URL=`
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=`

## Run
1. `npm run start`
2. `npm run android`

## Project notes
- The repository is mobile-only now; the deprecated Next.js web app and its static assets were removed.
- `npm run typecheck` validates the Expo app source.
- `npm run lint` is scoped to the JavaScript config/tooling files that remain in the repo.
- If the emulator shows `Unable to load script`, open the dev menu and set `Debug server host & port` to `10.0.2.2:8081`, then reload.
