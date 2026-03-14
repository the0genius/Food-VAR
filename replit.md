# FoodVAR

## Overview
FoodVAR is a mobile-first application designed to help users make healthier food choices. It allows users to scan or search for food products and receive a personalized health score (0-100) based on their individual health profile, including conditions, allergies, and dietary preferences. The app flags allergens, provides AI-generated dietary advice using Google Gemini, and enables users to contribute new product information. The project aims to empower users with personalized nutritional insights, promote healthier eating habits, and build a community-driven food product database.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54, utilizing `expo-router` for file-based routing.
- **Navigation**: Tab-based navigation with Home, Scan, History, and Profile tabs, complemented by modal screens for results and onboarding.
- **State Management**: TanStack React Query for server-side state, React Context (`UserContext`) for user sessions, and AsyncStorage for local persistence.
- **Styling**: React Native StyleSheet with centralized design tokens (`constants/colors.ts`).
- **UI/UX**: Features `phosphor-react-native` for icons, `moti` and `react-native-reanimated` for animations (skeleton loaders, entry/layout animations), and `expo-linear-gradient` for visual enhancements across the UI.
- **API Communication**: Uses `expo/fetch` with `apiRequest()` and `getApiUrl()` helpers, deriving the API URL from `EXPO_PUBLIC_DOMAIN`.

### Backend (Express.js)
- **Server**: Express v5 on Node.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data persistence.
- **Schema**: Shared `shared/schema.ts` for type consistency between frontend and backend, using Drizzle's `pgTable` and Zod for validation.
- **Core Features**: Personalized health scoring, AI-powered dietary advice and nutrition extraction, user authentication, and product contribution/moderation.
- **Security**: Implements JWT-based authentication, bcrypt hashing, `requireAuth` middleware, Helmet security headers, and rate limiting.
- **Logging**: Structured JSON logging with `server/logger.ts`, including request IDs and redaction of sensitive data.
- **Error Handling**: Centralized error handler returning request IDs.

### Scoring Engine
- Computes a personalized 0-100 health score considering user health profiles and product nutritional data.
- Prioritizes allergen matching (score 0 if an allergen match is found).
- Scoring rules are configurable and stored in the database.
- Utilizes profile clustering (`computeClusterId()`) for efficient AI advice caching.

### AI Advice & Integrations
- Leverages Google Gemini via Replit AI Integrations for personalized dietary advice, nutrition extraction from images, and optionally chat/image generation (features are behind feature flags).
- AI advice is cached per product and profile cluster with TTL for performance and cost efficiency.
- Employs strict AI safety rules, including prompt hardening, injection defense, schema validation, and deterministic fallbacks.

### Key Architectural Decisions
- **Shared Schema**: Ensures type consistency and reduces errors between frontend and backend.
- **Profile Clustering & Caching**: Optimizes AI advice delivery and reduces API calls.
- **File-based Routing**: Simplifies navigation and project structure.
- **Modal Presentation**: Enhances user experience for results and contributions.
- **Feature Flags**: Manages risk and enables phased rollout of capabilities like chat and image generation.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **drizzle-kit**: Schema migration tooling.

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

### Environment Variables
- `DATABASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY`
- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `SESSION_SECRET`
- See `.env.example` for feature flags

## Database & Migrations
- **Migration strategy**: Drizzle Kit generates migration files in `./migrations/`. Use `npm run db:migrate` for production deployments. `npm run db:push` is for development only.
- **Schema tables**: users, refresh_tokens, products, scan_history, advice_cache, scoring_rules, daily_scan_tracker, conversations, messages
- **Chat ownership**: Conversations and messages tables have `userId` foreign key with cascade delete. All chat storage functions and routes enforce user ownership — no user can access another user's data.
- **scanDate**: Uses PostgreSQL `date` type (not text), with `mode: "string"` for YYYY-MM-DD string comparisons in application code.
- **Seed data provenance**: Seed products use `source: "seed_reference"` to distinguish from user-contributed data.

## Production Hardening (All 10 Phases Complete)
1. Feature flags for risky capabilities (chat, image gen, unverified products)
2. JWT auth with bcrypt, refresh token rotation, SecureStore
3. AI safety: prompt hardening, schema validation, deterministic fallback
4. Scoring engine versioning, declared vs inferred allergens, admin moderation
5. Zod validation, structured logging, rate limiting, request IDs
6. Query production defaults, focusManager/onlineManager, accessibility, error states
7. Privacy policy, terms of service, consent capture, data export, account deletion
8. 50-product seed catalog with real nutritional data
9. 47 unit tests (vitest): scoring, AI advice, feature flags, schema ownership
10. Deployment configured (autoscale), health check endpoint

## Testing
- Unit tests: `npx vitest run` (47 tests across 4 files)
- Seed products: `npx tsx scripts/seed-products.ts` (50 products, idempotent)