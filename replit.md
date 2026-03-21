# FoodVAR

## Overview
FoodVAR is a mobile-first application designed to help users make healthier food choices. It allows users to scan or search for food products and receive a personalized health score (0-100) based on their individual health profile, including conditions, allergies, and dietary preferences. The app flags allergens, provides AI-generated dietary advice using Google Gemini, and enables users to contribute new product information. The project aims to empower users with personalized nutritional insights, promote healthier eating habits, and build a community-driven food product database.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54, utilizing `expo-router` for file-based routing.
- **Navigation**: Tab-based navigation with Home, Scan, History, and Profile tabs, complemented by modal screens for results and onboarding.
- **State Management**: TanStack React Query for server-side state, React Context (`UserContext`) for user sessions, `ThemeContext` for light/dark mode preference, and AsyncStorage for local persistence.
- **Styling**: React Native StyleSheet with centralized design tokens (`constants/colors.ts`).
- **UI/UX**: Features `phosphor-react-native` for icons, `moti` and `react-native-reanimated` for animations (skeleton loaders, entry/layout animations), and `expo-linear-gradient` for visual enhancements across the UI.
- **API Communication**: Uses `expo/fetch` with `apiRequest()` and `getApiUrl()` helpers, deriving the API URL from `EXPO_PUBLIC_DOMAIN`.

### Backend (Express.js)
- **Server**: Express v5 on Node.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data persistence.
- **Schema**: Shared `shared/schema.ts` for type consistency between frontend and backend, using Drizzle's `pgTable` and Zod for validation.
- **Core Features**: Personalized health scoring, AI-powered dietary advice and nutrition extraction, user authentication, product contribution/moderation, and FatSecret API integration for barcode product lookup.
- **Security**: Implements JWT-based authentication, bcrypt hashing, `requireAuth` middleware, Helmet security headers, and rate limiting.
- **Logging**: Structured JSON logging via pino (`server/logger.ts`), with request IDs and redaction of passwords, tokens, health data, and chat content.
- **Error Handling**: Centralized error handler returning request IDs.

### Scoring Engine
- Computes a personalized 0-100 health score considering user health profiles and product nutritional data.
- Prioritizes allergen matching (score 0 if an allergen match is found).
- Scoring rules are configurable and stored in the database.
- Utilizes profile clustering (`computeClusterId()`) for efficient AI advice caching.

### AI Advice & Integrations
- Leverages Google Gemini via Replit AI Integrations for personalized dietary advice, nutrition extraction from images, and optionally chat/image generation (features are behind feature flags).
- AI advice is cached per product and profile cluster with TTL for performance and cost efficiency. Cache stores headline, coachTip, highlights, and adviceText so cache hits render identically to fresh AI responses. Pre-existing cache entries without headline/coachTip gracefully fall back to deterministic advice values.
- Employs strict AI safety rules, including prompt hardening, injection defense, schema validation, and deterministic fallbacks.

### Key Architectural Decisions
- **Shared Schema**: Ensures type consistency and reduces errors between frontend and backend.
- **Profile Clustering & Caching**: Optimizes AI advice delivery and reduces API calls.
- **File-based Routing**: Simplifies navigation and project structure.
- **Modal Presentation**: Enhances user experience for results and contributions.
- **Feature Flags**: Manages risk and enables phased rollout of capabilities like chat and image generation.
- **Dark Mode Support**: `useThemeColors()` hook in `constants/colors.ts` provides light/dark token sets; priority screens (Home, History, Profile, tab bar) apply theme-driven backgrounds and text colors. StatusBar auto-adapts. Manual theme toggle on Profile screen via `ThemeContext` (`contexts/ThemeContext.tsx`) — stores preference (light/dark/system) in AsyncStorage, persists across restarts.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **drizzle-kit**: Schema migration tooling.

### FatSecret Platform API
- **Purpose**: Primary food database for barcode product lookup.
- **Auth**: OAuth 2.0 client credentials grant, token cached with TTL.
- **Service**: `server/fatsecret.ts` — `fetchByBarcode()`, `lookupBarcode()`, `getFoodDetails()`.
- **Barcode lookup waterfall**: FatSecret API → local DB (user-contributed) → contribute flow (404).
- **Data mapping**: FatSecret serving format → our Product schema fields. Allergens inferred from ingredients via `inferAllergensFromIngredients()`.
- **Thin-reference architecture**: FatSecret products are stored as thin references in the products table (name, brand, category, fatsecretFoodId) with `source: "fatsecret"`, `moderationStatus: "approved"`. Full nutrition data is fetched fresh from FatSecret at request time (barcode lookup and scoring). Local DB fallback excludes FatSecret-sourced rows.
- **Upsert logic**: FatSecret products saved to products table with `source: "fatsecret"`, `moderationStatus: "approved"`, `fatsecretFoodId`. Existing user-contributed products are NOT overwritten.
- **API resilience**: All FatSecret API calls have a 10-second timeout (AbortController) and single retry with 1-second backoff on transient failures (5xx, network errors). Token endpoint uses standard fetch.
- **IP whitelisting**: FatSecret may require server IP to be added to the developer portal's allowed list.
- **Env vars**: `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`.

### AI Services
- **Google Gemini via Replit AI Integrations**: Used for AI advice, nutrition extraction, chat, and image generation.
    - Models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-image`.

### Key NPM Dependencies
- `express`: Backend web framework.
- `expo`, `expo-router`: Frontend framework and routing.
- `@tanstack/react-query`: Server state management.
- `drizzle-orm`, `drizzle-zod`, `pg`: Database interaction and validation.
- `@google/genai`: Gemini AI SDK.
- `p-limit`, `p-retry`: Utilities for batch processing and resilience.
- `react-native-reanimated`, `moti`: Animation libraries.
- `phosphor-react-native`: Icon library.
- `expo-camera`, `expo-image-picker`: Mobile device capabilities.
- `@react-native-async-storage/async-storage`: Local storage.
- `@sentry/react-native`: Error monitoring and crash reporting.

### Error Monitoring
- **Sentry** (org: `foodvar`, project: `react-native`): Captures unhandled JS errors, native crashes, and React component errors.
- Initialized in `app/_layout.tsx` with `Sentry.init()`, disabled in dev (`enabled: !__DEV__`).
- `ErrorBoundary` (`components/ErrorBoundary.tsx`) reports component-level errors to Sentry via `Sentry.captureException()`.
- DSN stored in `EXPO_PUBLIC_SENTRY_DSN` env var.
- Expo plugin configured in `app.json` for source maps and debug symbols upload.
- Performance tracing at 20% sample rate, PII sending disabled.

### Environment Variables
- `DATABASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY`
- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `EXPO_PUBLIC_SENTRY_DSN`
- `SESSION_SECRET`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- See `.env.example` for feature flags

## Database & Migrations
- **Migration strategy**: Drizzle Kit generates migration files in `./migrations/`. Use `npm run db:migrate` for production deployments. `npm run db:push` is for development only. Migration 0000 is a full baseline for fresh DBs; migrations 0001/0002 are incremental for existing environments (idempotent with IF NOT EXISTS/type guards). For pre-existing databases, baseline the drizzle journal before running incremental migrations.
- **Schema tables**: users, refresh_tokens, products, scan_history, advice_cache, scoring_rules, daily_scan_tracker, conversations, messages, email_verification_tokens, password_reset_tokens
- **Chat ownership**: Conversations and messages tables have `userId` foreign key with cascade delete. All chat storage functions and routes enforce user ownership — no user can access another user's data.
- **scanDate**: Uses PostgreSQL `date` type (not text), with `mode: "string"` for YYYY-MM-DD string comparisons in application code.
- **Seed data provenance**: Seed products use `source: "seed_reference"` to distinguish from user-contributed data.

## Production Hardening (All 10 Phases Complete)
1. Feature flags for risky capabilities (chat, image gen, unverified products)
2. JWT auth with bcrypt, refresh token rotation with reuse detection, SecureStore
3. AI safety: prompt hardening, schema validation, deterministic fallback
4. Scoring engine versioning, declared vs inferred allergens, admin moderation
5. Zod validation, structured logging, rate limiting, request IDs
6. Query production defaults, focusManager/onlineManager, accessibility, error states
7. Privacy policy, terms of service, consent capture, data export, account deletion
8. 50-product seed catalog with real nutritional data
9. 69 unit tests (vitest): scoring, AI advice, feature flags, schema ownership, allergen safety, product visibility
10. Deployment configured (autoscale), health check endpoint

## Second-Round Hardening (Tasks #1-5)
- Task #1: Schema, migrations & data ownership fixes (conversations/messages userId FK, scanDate date type, migration chain)
- Task #2: Allergen safety (declaredAllergens-only scoring, inferredAllergenWarnings, getApprovedProductFilter)
- Task #16: Allergen display clarity — `allergenDisplayState` field (`hard_alert`, `product_contains_nonmatching`, `possible_risk`, `none`) added to score responses; result screen renders four distinct states with appropriate colors (red for hard alert, amber for product-contains/possible-risk, neutral for none); green never used for allergen status; "No allergens detected" replaced with profile-aware wording
- Task #3: AI cache & history integrity (version-aware cache, extraction confidence, history preservation, medical disclaimer)
- Task #4: Auth flows & operational readiness (email verification, password reset, pino logger, health/readiness endpoints, env validation, ALLOWED_ORIGINS CORS)
- Task #5: UX quality (unified score labels via shared/score-labels.ts, accessibility labels, non-color-only score meaning, 83 tests)

## Auth Security
- **Social sign-in only**: Google and Apple sign-in via POST /api/auth/google and POST /api/auth/apple. No email/password auth.
- **Token verification**: Google tokens verified via tokeninfo endpoint; Apple tokens decoded and validated (iss, exp).
- **User linking**: `findOrCreateSocialUser` links by (provider+providerId) → email match → new user creation.
- **Schema**: users table has `authProvider` and `authProviderId` columns. `passwordHash` column retained (nullable) for backwards compatibility. `emailVerificationTokens` and `passwordResetTokens` tables removed from schema.
- **Refresh token reuse detection**: If a revoked refresh token is replayed, all sessions for that user are invalidated.
- **Rate limiting**: Auth endpoints 20 req/15min, refresh 30 req/15min, AI routes 20 req/min
- **Web auth storage**: AsyncStorage (localStorage) on web — documented tradeoff in HARDENING_STATUS.md. SecureStore on native.
- **Frontend**: Google OAuth via expo-web-browser (manual auth session flow, no expo-auth-session dependency), expo-apple-authentication for Apple. UserContext exposes `loginWithGoogle`, `loginWithApple`, `devLogin`.

## Operational
- **Logger**: pino with structured JSON, redaction of sensitive fields (passwords, tokens, health data, chat content)
- **Health check**: GET /api/health — checks DB connectivity, returns version
- **Readiness**: GET /api/readiness — checks DB, SESSION_SECRET, AI key
- **Startup validation**: Required env vars (DATABASE_URL, SESSION_SECRET) validated at boot; optional vars logged as warnings
- **CORS**: Supports REPLIT_DOMAINS, REPLIT_DEV_DOMAIN, localhost, and ALLOWED_ORIGINS env var
- **Typecheck**: `npm run typecheck` (tsc --noEmit)

### Allergen Inference
- `server/allergen-inference.ts`: Shared `ALLERGEN_GROUPS` dictionary and `inferAllergensFromIngredients()` function — scans ingredient text for allergen keywords using word-boundary regex matching
- Seed script and contribute endpoint both compute `inferredAllergens` server-side from ingredient text
- Backfill script: `npx tsx scripts/backfill-inferred-allergens.ts` — recomputes `inferredAllergens` for all products with ingredients

## Testing
- Unit tests: `npx vitest run` (121 tests across 8 files)
- Seed products: `npx tsx scripts/seed-products.ts` (50 products, idempotent)