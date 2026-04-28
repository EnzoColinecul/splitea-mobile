# Splitea Mobile: Detailed Project Overview

## 1. Project Context and Goals

Splitea Mobile is an Expo + React Native application focused on shared expense management. The current product helps users:
- Register/login and manage profile preferences
- Add friends and create groups
- Create and split expenses manually
- Settle balances between participants
- Use AI-assisted receipt workflows (scan, transcribe voice instructions, analyze receipt, propose splits)

### Core Product Goal
Deliver a fast, trustworthy shared-expense experience that reduces friction from “who owes what” to actual settlement.

### Strategic Goal (Next 12 Months)
Evolve from expense tracking into a monetizable and integrated financial coordination platform by introducing:
- A `Freemium + Pro` subscription model
- Mercado Pago wallet connectivity as an optional settlement path
- Better reliability, observability, and test coverage to support payment and subscription-critical workflows

---

## 2. Current Architecture

## 2.1 Frontend Architecture (Expo Router + React Native)

### Routing and Navigation
The app uses Expo Router with grouped routes and nested layouts:
- Root layout: `src/app/_layout.tsx`
- Auth group: `src/app/(auth)`
- Main tabs group: `src/app/(tabs)`
- Expense flow group: `src/app/expense`
- Utility/system routes (profile, notifications, language/currency pickers, settle-up, etc.)

Current navigation shape:
- `(auth)` for login/register
- `(tabs)` with main surfaces: home, groups, add, friends, settings
- `expense/*` for multi-step expense creation and receipt flow

### Screen Organization
UI is organized by functional surfaces under `src/screens`:
- `auth/*`
- `tabs/*`
- `expense/*`
- `groups/*`
- `system/*`

This split is practical and clear for feature ownership.

### Shared UI and Theme
Reusable primitives are in `src/components/common` and global style tokens in `src/theme/theme.ts`:
- Color palette
- Spacing scale
- Border radius tokens

This provides a base design system, though current styling remains largely screen-local.

## 2.2 State and Authentication

### Auth Provider
`src/hooks/useAuth.tsx` acts as global auth gate:
- Loads token from `expo-secure-store`
- Verifies session with `userApi.getProfile()` on startup
- Redirects based on route segment and auth state
- Provides `signIn` and `signOut` methods

### Token Storage
Persistent token key:
- `userToken` stored in `expo-secure-store`

### Unauthorized Event Bus
A lightweight global event system in `src/utils/auth-events.ts`:
- API client emits unauthorized event on `401`
- AuthProvider subscribes and signs out user

This creates a centralized auth-failure behavior without coupling every screen to auth logic.

## 2.3 API Layer and Backend Integration

### HTTP Client
`src/api/api-client.ts` uses axios with:
- Base URL configuration (currently hardcoded local IP)
- Request interceptor adding bearer token from secure store
- Response interceptor handling logs/errors and unauthorized events

### Domain APIs
Modular API wrappers:
- `src/api/auth.ts`
- `src/api/user.ts`
- `src/api/social.ts` (friends/groups)
- `src/api/expenses.ts`
- `src/api/notifications.ts`

### Expo API Proxy Routes
Server-route wrappers under Expo Router API routes:
- `src/app/api/transcribe+api.ts`
- `src/app/api/storage/presigned+api.ts`

These proxy selected calls to backend endpoints, helping with request shaping and environment routing.

## 2.4 Data and Domain Model Snapshot

Main entities from `src/types/index.ts`:
- `User`, `UserUpdate`, `AuthResponse`
- `Group`, `Friend`, `FriendRequest`, `Notification`
- `Expense`, `ExpenseSplit`, `SplitType`
- `DashboardSummary`, `ExpenseStatistics`, `GroupBalance`

Domain is already aligned to core expense splitting and social coordination.

## 2.5 End-to-End Functional Flows

### A) Onboarding/Auth
1. User logs in/registers
2. Token saved in SecureStore
3. Root auth logic validates and routes to tabs

### B) Manual Expense Creation
1. Select participants (friends or group)
2. Choose method/split type
3. Enter details
4. Create expense through `/expense/create`

### C) AI Receipt Flow
1. Select/capture receipt image
2. (Optional) record voice instruction
3. Transcribe instruction (`/expense/transcribe-instruction`)
4. Request presigned URL and upload receipt
5. Analyze receipt (`/expense/analyze-receipt`)
6. Preview/edit split and finalize expense

### D) Balances and Settlement
1. Home/group surfaces display outstanding balances
2. User initiates settle-up (`/expense/settle-up` and related split settle endpoints)
3. Current settlement is app-native and not yet wallet-integrated

---

## 3. Improvement Opportunities (Prioritized)

## Priority 1: Configuration and Security Hardening

### Observed Signals
- `src/api/api-client.ts` contains hardcoded local network base URL (`http://192.168.68.54:8000/api`)

### Improvement
- Move to environment-driven API configuration (`EXPO_PUBLIC_API_URL`) per environment (dev/staging/prod)
- Add startup validation for required runtime env vars
- Ensure no environment-specific endpoints are committed as defaults

### Expected Impact
- Safer releases
- Fewer environment misroutes
- Better CI/CD portability

## Priority 2: Type Safety and Contract Reliability

### Observed Signals
- Widespread `any` usage across APIs and screens (`rg` findings in `src/api/*`, `src/screens/*`, `src/utils/*`)

### Improvement
- Define typed DTOs for API responses and requests
- Replace `any` in critical financial/payment pathways first
- Introduce domain-normalization helpers for backend-to-UI shape consistency

### Expected Impact
- Lower runtime bug risk
- Better refactor safety
- Faster onboarding for contributors

## Priority 3: Reliability and Resilience for Critical Flows

### Observed Signals
- Localized `try/catch` and ad-hoc error handling
- No explicit retry/backoff/idempotency layer in client

### Improvement
- Centralize API error translation and user-facing messaging
- Add request retry policy for transient network failures
- Introduce offline queue for settlements and receipt processing tasks
- Add idempotency key support for financial mutation endpoints

### Expected Impact
- Higher success rate in unstable network conditions
- Reduced duplicate financial actions
- Better trust in settlement workflows

## Priority 4: Observability and Incident Response

### Observed Signals
- Verbose console logging in API client
- No structured telemetry/crash monitoring integrated

### Improvement
- Add structured logger abstraction with environment-level verbosity
- Integrate crash + error reporting (e.g., Sentry or equivalent)
- Add analytics events for core conversion funnel (AI usage, settle-up, subscription prompts)

### Expected Impact
- Faster production debugging
- Better product decisions from usage data
- Clearer SLA/quality tracking

## Priority 5: Testing Strategy Baseline

### Observed Signals
- No configured unit/integration/E2E framework in `package.json`

### Improvement
- Add unit testing (domain logic, helpers)
- Add API contract tests for key request/response shapes
- Add mobile E2E smoke path for auth, expense create, settle-up

### Expected Impact
- Safer releases
- Better confidence for payment/subscription rollout

## Priority 6: UX and Performance Consistency

### Observed Signals
- Screen-level loading/refresh patterns vary
- Potential duplicate fetches and no request cancellation strategy

### Improvement
- Standardize async state conventions (`idle/loading/success/error`) in reusable hooks
- Add request cancellation/deduplication
- Define pagination strategy for activity/friends/groups where needed

### Expected Impact
- More consistent UX
- Lower perceived latency
- Better scalability as data volume grows

---

## 4. Product and Engineering Roadmap (Quarterly)

## Q1 (0-3 Months): Foundation Hardening

### Objectives
- Stabilize architecture for payment and subscription-critical expansion

### Deliverables
- Environment-based API configuration with stage validation
- Type-safety pass on auth/expense/settlement modules
- Unified error handling and retry policy
- Structured telemetry and crash monitoring integration
- Test scaffolding (unit + contract + E2E smoke)

### Dependencies
- Backend alignment on stable response contracts
- CI setup for tests and type checks

### Success Criteria
- Reduced crash and API failure rates
- Type coverage improvement in core modules
- Baseline smoke tests passing in CI

## Q2 (3-6 Months): Subscription System (Freemium + Pro)

### Business Model
- Free tier: core expense/group/friend functionality + limited AI quota
- Pro tier: unlimited AI + advanced insights + scheduled reminders

### Billing Stack
- RevenueCat + native app stores (iOS/Android)

### Feature Scope
- Entitlements and plan state sync in app
- Paywall and upgrade UX
- Restore purchases flow
- Free-tier AI quota policy (example: capped weekly usage)
- Scheduled reminder features for:
  - individual users
  - groups

### Platform/Backend Scope
- Subscription status endpoint
- Restore endpoint
- RevenueCat webhook ingestion path and entitlement sync pipeline

### Success Criteria
- Subscription conversion funnel operational
- Accurate entitlement enforcement
- AI quota gating working without blocking paid users

## Q3 (6-9 Months): Mercado Pago Wallet Integration

### Product Behavior (Confirmed)
- Wallet connection is optional
- Users can use app without Mercado Pago
- During settle-up, users can choose Mercado Pago as payment method
- App must receive and process Mercado Pago payment response

### Feature Scope
- Connect wallet flow (OAuth/redirect-style)
- Wallet status visibility in settings/profile
- Settlement method selector includes Mercado Pago
- Callback and reconciliation flow updates settlement state
- Transaction history mapping from external payment to internal debt settlement

### Reliability Requirements
- Idempotent settlement creation and webhook handling
- Retry and reconciliation jobs for delayed/missed callbacks
- Clear failure and pending states in UI

### Success Criteria
- High callback success and reconciliation rates
- Reduced settlement friction
- No regression for non-wallet users

## Q4 (9-12 Months): Advanced Intelligence and Growth

### Feature Scope
- Advanced automated reminders and smarter timing
- Deep financial insights and trend intelligence
- Better retention loops (win-back nudges, milestone-based prompts)
- Improvement of social/group coordination workflows

### Success Criteria
- Increased engagement and retention
- Higher settle-up completion rates
- Stronger paid feature adoption

---

## 5. Public APIs, Interfaces, and Type Additions for Roadmap

## 5.1 Subscription Domain

### API Endpoints
- `GET /subscription/status`
- `POST /subscription/restore`
- Webhook ingestion path for RevenueCat entitlement updates (e.g., `POST /webhooks/revenuecat`)

### Client/Domain Types
```ts
export type SubscriptionTier = 'free' | 'pro';

export interface Entitlements {
  tier: SubscriptionTier;
  ai_unlimited: boolean;
  scheduled_reminders: boolean;
  advanced_insights: boolean;
  expires_at?: string;
}

export interface UsageQuota {
  period: 'weekly' | 'monthly';
  ai_used: number;
  ai_limit: number | 'unlimited';
  resets_at: string;
}
```

## 5.2 Mercado Pago Wallet Domain

### API Endpoints
- `POST /wallets/mercadopago/connect/start`
- `GET /wallets/mercadopago/connect/callback`
- `POST /payments/settle/mercadopago`
- `POST /webhooks/mercadopago`

### Client/Domain Types
```ts
export interface WalletConnection {
  provider: 'mercado_pago';
  status: 'not_connected' | 'pending' | 'connected' | 'error';
  external_user_id?: string;
  connected_at?: string;
  last_error?: string;
}

export interface SettlementAttempt {
  settlement_id: string;
  expense_or_split_id: string;
  provider: 'mercado_pago' | 'manual';
  amount: number;
  currency: string;
  idempotency_key: string;
  status: 'created' | 'pending_external' | 'confirmed' | 'failed' | 'reconciled';
  created_at: string;
}

export interface SettlementResult {
  settlement_id: string;
  provider: 'mercado_pago';
  external_payment_id?: string;
  external_status: ExternalPaymentStatus;
  internal_status: 'pending_external' | 'confirmed' | 'failed' | 'reconciled';
  processed_at: string;
}

export type ExternalPaymentStatus =
  | 'approved'
  | 'pending'
  | 'in_process'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';
```

## 5.3 Expense Settlement State Machine Extension

Extend internal settlement states to include:
- `pending_external`
- `confirmed`
- `failed`
- `reconciled`

### Behavioral Requirements
- Settlement mutation endpoints require idempotency keys
- Webhook handlers process events idempotently
- UI differentiates pending external confirmation vs final confirmation

---

## 6. Risks and Mitigations

## 6.1 App Store Billing Compliance Risk

### Risk
Subscription flows can violate app-store billing policy if purchase paths are not implemented correctly.

### Mitigations
- Use RevenueCat native SDK patterns
- Keep in-app digital subscriptions on app-store billing rails
- Add policy checks to release checklist

## 6.2 Webhook Correctness and Event Ordering Risk

### Risk
Out-of-order/duplicate webhook events can corrupt entitlement or settlement states.

### Mitigations
- Idempotent event handling with event IDs
- Event versioning and replay-safe processors
- Dead-letter queue and monitoring alerts

## 6.3 Payment Idempotency Risk

### Risk
Duplicate settle-up submissions can create duplicate charges/records.

### Mitigations
- Mandatory idempotency key in settle-up create endpoints
- Server-side idempotency store with TTL
- Client retry logic tied to same idempotency key

## 6.4 Background Sync and Callback Delivery Risk

### Risk
Mobile lifecycle/network issues may delay callback processing visibility.

### Mitigations
- Background reconciliation job
- Poll fallback for pending payments
- UI guidance for “pending confirmation” state

## 6.5 Privacy and Security Risk

### Risk
Handling wallet, payment metadata, and subscription status increases sensitivity.

### Mitigations
- Minimize stored external payment data
- Encrypt sensitive fields at rest
- Audit logs for critical payment/subscription state changes
- Data retention and deletion policy enforcement

---

## 7. Success Metrics

Track at product and reliability layers:

## Subscription Metrics
- Free-to-Pro conversion rate
- Trial-to-paid conversion (if trials enabled)
- Churn and renewal rates

## Settlement Metrics
- Settlement completion rate
- Median time from debt creation to settlement
- Mercado Pago settlement success/failure/pending ratios

## Reminder and Engagement Metrics
- Reminder open/interaction rate
- Reminder-to-settlement conversion rate
- Group-level engagement retention

## AI Monetization Metrics
- Free-tier AI quota exhaustion rate
- Upgrade rate after quota exhaustion
- AI usage per active user by tier

## Technical Reliability Metrics
- Payment callback success rate
- Reconciliation lag (callback to internal settlement finalization)
- Error budget for critical endpoints
- Crash-free sessions

---

## 8. Test Plan for This Initiative

The following test plan should be used as implementation acceptance criteria for the roadmap:

## 8.1 Documentation Quality Checks
- Confirm architecture section matches current codebase structure (routes, auth provider, API modules, types)
- Confirm each improvement item maps to observed repo evidence
- Confirm roadmap includes dependencies, outputs, and measurable outcomes
- Confirm wallet and subscription sections include happy + failure paths
- Confirm readability for both engineering and product stakeholders

## 8.2 Subscription System Test Scenarios
- User upgrades to Pro and receives entitlement in app
- Restore purchases recovers entitlement after reinstall/login
- Free-tier AI limit blocks excess usage correctly
- Pro users bypass AI cap and access premium reminder/insight features
- RevenueCat webhook retry/duplicate delivery does not create inconsistent entitlements

## 8.3 Mercado Pago Integration Test Scenarios
- Optional connect flow succeeds and stores connection state
- User without wallet can still settle manually
- User selects Mercado Pago in settle-up, external payment initiated successfully
- Callback updates internal settlement status to confirmed
- Failed/rejected payment maps to failed with clear user messaging
- Delayed callback remains pending and reconciles correctly later
- Duplicate webhook delivery stays idempotent

## 8.4 Regression and Non-Functional Tests
- Auth routing behavior remains correct across token expiration and re-login
- Existing expense creation (manual + AI-assisted) remains functional
- Performance baselines remain acceptable under added telemetry and entitlement checks

---

## 9. Assumptions and Defaults Applied

- Document language: English
- Subscription model: Freemium + Pro
- Premium gating: AI features + advanced insights + scheduled reminders
- Free AI policy: capped usage in period (example weekly cap), premium unlimited
- Billing stack default: RevenueCat + native app stores
- Mercado Pago scope: optional wallet connect; settlement method choice at settle-up; app receives/processes provider response
- Roadmap style: phased quarterly timeline

---

## 10. Recommended Next Execution Steps

1. Finalize and publish API contract drafts for subscription and Mercado Pago domains
2. Create technical RFC for settlement state machine + idempotency architecture
3. Prioritize Q1 hardening tickets (env config, type safety, observability, tests)
4. Start Q2 subscription implementation with RevenueCat sandbox-first rollout
5. Implement Mercado Pago in staged rollout with internal beta before broad release
