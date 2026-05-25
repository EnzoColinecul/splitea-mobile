# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Splitea Mobile is an Expo + React Native app for shared expense management. It supports manual and AI-assisted (receipt scan + voice) expense splitting, friend/group management, and balance settlement.

## Commands

```bash
# Start dev server
npm start

# Run on device/simulator
npm run ios
npm run android

# Lint
npm run lint
npm run lint:fix
```

There is no test runner configured — no unit/integration/E2E tests exist yet.

## Architecture

### Routing (Expo Router file-based)

Route files live in `src/app/` and thin-wrap screen components from `src/screens/`:

| Route group | Purpose |
|---|---|
| `(auth)/` | Login, register |
| `(tabs)/` | Main tab navigation: home, groups, add, friends, settings |
| `expense/` | Multi-step expense flow: choice → method → details → scan-receipt → receipt-split-preview → view |
| `api/` | Expo server-route proxies for transcription and S3 presigned URLs |
| Root-level routes | profile, profile-settings, group-detail, create-group, settle-up, notifications, friend-requests, currency-picker, language-picker |

The `src/app/` files are thin shells — all logic and UI lives in `src/screens/`.

Path alias `@/` maps to `src/`.

### Auth Flow

`src/hooks/useAuth.tsx` is the global auth context (wrap: `AuthProvider` in `src/app/_layout.tsx`):
- On mount: reads `userToken` from `expo-secure-store`, verifies it against `userApi.getProfile()`.
- On 401 from any API call: `src/utils/auth-events.ts` event bus triggers `signOut()`.
- Route protection: segment-based redirect — unauthenticated → `/(auth)/login`, authenticated + in auth screens → `/(tabs)`.
- Offline resilience: non-401 errors during token validation keep the user logged in.

### API Layer

`src/api/api-client.ts` — axios instance:
- Base URL is currently **hardcoded** (`http://192.168.1.172:8000/api`) — must be updated to the local machine IP for physical device testing.
- Request interceptor: attaches `Bearer` token from SecureStore.
- Response interceptor: emits unauthorized event on 401.

Domain API modules (`src/api/`): `auth`, `user`, `social`, `expenses`, `notifications` — each wraps `apiClient` calls.

### Screen / Component Structure

```
src/
  app/          # Expo Router route files (thin wrappers)
  screens/
    auth/       # Login, register
    tabs/       # Home, friends, groups, settings, add-expense tab
    expense/    # Expense creation flow screens
    groups/     # Group detail, create group
    system/     # Profile, notifications, settle-up, pickers, modal, 404
  components/
    common/     # shared.tsx (reusable primitives), badge.tsx
    expenses/   # participant-selector, split-editor
    groups/     # add-member-modal
    legacy/     # Unused scaffolding — do not use
  api/          # API clients
  hooks/        # useAuth (only hook)
  types/        # index.ts — all domain types
  theme/        # theme.ts — Colors, Spacing, BorderRadius tokens
  constants/    # colors.ts
  utils/        # auth-events.ts (event bus), events.ts, expense-display.ts
```

### Domain Types (`src/types/index.ts`)

Core entities: `User`, `AuthResponse`, `UserUpdate`, `Group`, `Friend`, `FriendRequest`, `Notification`, `Expense`, `ExpenseSplit`, `SplitType` (enum), `DashboardSummary`, `ExpenseStatistics`, `GroupBalance`.

### Theme System

Use tokens from `src/theme/theme.ts` (`Colors`, `Spacing`, `BorderRadius`) for all styling. Avoid inline magic numbers for colors or spacing. `src/constants/colors.ts` is a secondary color reference — `theme.ts` is the source of truth.

### AI Receipt Flow

The full receipt flow: `scan-receipt` → captures image + optional voice → calls `/api/transcribe+api.ts` (voice transcription proxy) → uploads receipt via presigned URL from `/api/storage/presigned+api.ts` → `receipt-split-preview` → `expense/details`.

## Known Issues / TODOs

- `API_BASE_URL` in `src/api/api-client.ts` must be updated to your local machine IP when testing on a physical device.
- Widespread `any` types in API modules and screens — avoid adding more; prefer explicit types from `src/types/index.ts`.
- No environment variable system yet; `EXPO_PUBLIC_API_URL` is the intended migration path.
- `src/components/legacy/` contains unused Expo template components — ignore them.
