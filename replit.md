# FoodVAR

## Overview

FoodVAR is a mobile-first food product scanning and health scoring application built with Expo (React Native) on the frontend and Express.js on the backend. Users complete a health onboarding profile (conditions, allergies, dietary preferences, goals), then scan or search for food products by barcode or name. The app computes a personalized health score (0-100) for each product based on the user's profile, flags allergens, and provides AI-generated dietary advice using Google Gemini. Users can also contribute new products to the database.

The app follows a client-server architecture where the Expo app communicates with an Express API server. Both share schema definitions through a `shared/` directory. Data is persisted in PostgreSQL via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with expo-router v6 for file-based routing
- **Navigation**: Tab-based layout with 4 tabs (Home, Scan, History, Profile) plus modal screens for results, contributions, and onboarding
- **State Management**: TanStack React Query for server state; React Context (`UserContext`) for user session/profile; AsyncStorage for local persistence of user session
- **Styling**: React Native StyleSheet with centralized design tokens (`constants/colors.ts` exports both `Colors` default and `C` named token set)
- **Icons**: phosphor-react-native (all screens use Phosphor icons — no @expo/vector-icons/Ionicons)
- **Animations**: moti (MotiView for skeleton loaders, entry animations), react-native-reanimated (layout animations, shared values)
- **Key Libraries**: expo-haptics (tactile feedback), expo-camera (barcode scanning), expo-image-picker (product image contribution), expo-linear-gradient (UI gradients throughout — FAB, buttons, headers, avatar, profile grid)
- **API Communication**: `lib/query-client.ts` provides `apiRequest()` and `getApiUrl()` helpers using `expo/fetch`. The API URL is derived from `EXPO_PUBLIC_DOMAIN` environment variable

### Backend (Express.js)
- **Server**: Express v5 running on Node.js with TypeScript (compiled via tsx in dev, esbuild for production)
- **Database**: PostgreSQL accessed through Drizzle ORM (`server/db.ts`)
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions with Zod validation schemas via `drizzle-zod`
- **Key Tables**: `users`, `products`, `scanHistory`, `dailyScanTracker`, `scoringRules`, `adviceCache`, `conversations`, `messages`
- **CORS**: Dynamic origin allowlist based on Replit environment variables, plus localhost for development

### Scoring Engine (`server/scoring-engine.ts`)
- Computes a personalized 0-100 health score for a product given a user's health profile
- Checks allergen matches between user allergies and product allergens (score = 0 if match found)
- Uses interpolation-based deductions from nutritional values
- Scoring rules stored in database for configurability
- Profile clustering via `computeClusterId()` for cache efficiency

### AI Advice (`server/ai-advice.ts`)
- Uses Google Gemini via Replit AI Integrations (`@google/genai`) for personalized dietary advice
- Caches advice per product + profile cluster with expiration (`adviceCache` table)
- Also supports nutrition extraction from images
- Environment variables: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`

### Replit Integrations (`server/replit_integrations/`)
- **Chat**: Full conversation CRUD with Gemini-powered chat (conversations + messages tables)
- **Image**: Image generation endpoint using `gemini-2.5-flash-image` model
- **Batch**: Utility for batch processing with concurrency limiting (`p-limit`), retry logic (`p-retry`), and rate limit handling

### API Routes (`server/routes.ts`)
- `POST /api/users` - Create or find user by email
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id/profile` - Update profile
- Product search, barcode lookup, scoring, and scan history endpoints
- Contribution endpoint for user-submitted products

### Key Architectural Decisions
1. **Shared schema between frontend and backend** - The `shared/` directory contains Drizzle schema and model definitions used by both sides, ensuring type consistency
2. **Profile clustering for cache efficiency** - Users with similar health profiles share cached AI advice, reducing API calls
3. **Advice caching with TTL** - AI-generated advice is cached in the database with expiration timestamps to balance freshness and cost
4. **File-based routing with expo-router** - Screens are organized under `app/` with `(tabs)/` group for the main tab navigator
5. **Modal presentation for results** - Result and contribute screens use modal presentation with slide-from-bottom animation for better UX

### Build & Deployment
- **Dev**: Expo dev server (`expo:dev`) + Express server (`server:dev`) run simultaneously
- **Production**: Static Expo build via custom `scripts/build.js`, Express server bundled with esbuild
- **Database migrations**: `drizzle-kit push` for schema synchronization

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM** - Type-safe query builder and schema management
- **drizzle-kit** - Schema migration tooling (push-based)

### AI Services
- **Google Gemini via Replit AI Integrations** - Used for dietary advice generation, nutrition extraction from images, chat, and image generation
  - Models used: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-image`
  - Environment variables: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`

### Key NPM Dependencies
- `express` v5 - HTTP server
- `expo` v54 - Mobile app framework
- `expo-router` v6 - File-based navigation
- `@tanstack/react-query` v5 - Server state management
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `pg` - PostgreSQL client
- `@google/genai` - Gemini AI SDK
- `p-limit` / `p-retry` - Concurrency and retry utilities for batch AI processing
- `react-native-reanimated` - Animations
- `moti` - Declarative animations and skeleton loaders
- `phosphor-react-native` - Icon library (replaces @expo/vector-icons)
- `expo-camera` - Barcode scanning
- `expo-image-picker` - Image selection for product contributions
- `@react-native-async-storage/async-storage` - Local user session persistence

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Gemini API key
- `AI_INTEGRATIONS_GEMINI_BASE_URL` - Gemini API base URL
- `EXPO_PUBLIC_DOMAIN` - Domain for API requests from the mobile app
- `REPLIT_DEV_DOMAIN` - Replit development domain (auto-set by Replit)