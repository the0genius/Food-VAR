# FoodVAR — Complete Application Report

---

## 1. Product Overview

**FoodVAR** is a personalized food product scanning and health scoring mobile application. Users create a health profile (conditions, allergies, dietary preferences, goals), then scan or search for food products. The app computes a personalized health score (0–100) for each product based on the user's unique profile, flags allergens, and provides AI-generated dietary advice using Google Gemini.

**Core Value Proposition:** Unlike generic nutrition apps, FoodVAR tailors every score and recommendation to the individual user's specific health conditions and goals. A product that scores 85 for one user might score 12 for another with diabetes.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────┐
│                  EXPO MOBILE APP                  │
│   (React Native + Expo Router + TanStack Query)   │
│                   Port 8081                       │
└────────────────────┬─────────────────────────────┘
                     │ HTTPS (fetch via expo/fetch)
                     ▼
┌──────────────────────────────────────────────────┐
│              EXPRESS.JS API SERVER                │
│         (TypeScript + Drizzle ORM)               │
│                   Port 5000                       │
│  ┌──────────────┬──────────────┬───────────────┐ │
│  │  REST API    │  AI Engine   │  Static Build │ │
│  │  /api/*      │  Gemini 2.5  │  Expo Bundles │ │
│  └──────────────┴──────────────┴───────────────┘ │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                  │
│     (Drizzle ORM + drizzle-kit push)             │
│  Tables: users, products, scan_history,          │
│  daily_scan_tracker, scoring_rules,              │
│  advice_cache, conversations, messages           │
└──────────────────────────────────────────────────┘
```

**Communication Pattern:** The Expo app uses `expo/fetch` with `credentials: "include"` to call the Express API. The API URL is derived from the `EXPO_PUBLIC_DOMAIN` environment variable. TanStack Query manages all server state with a global default query function that routes based on query keys.

---

## 3. Database Schema (8 Tables)

### 3.1 `users`
Stores user identity, health profile, and app status.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | Auto-increment |
| email | text | NOT NULL, UNIQUE |
| name | text | Default: "" |
| age | integer | Nullable |
| gender | text | Nullable |
| heightCm | real | Nullable |
| weightKg | real | Nullable |
| conditions | jsonb (string[]) | Default: [] — e.g., ["diabetes_type2", "hypertension"] |
| conditionsOther | text | Free-text for unlisted conditions |
| allergies | jsonb (string[]) | Default: [] — e.g., ["peanuts", "shellfish"] |
| allergiesOther | text | Free-text for unlisted allergies |
| dietaryPreference | text | "vegetarian", "vegan", "halal", etc. |
| goal | text | "weight_loss", "muscle_gain", etc. |
| profileClusterId | text | Deterministic hash of conditions+allergies+diet+goal |
| onboardingCompleted | boolean | Default: false |
| isPro | boolean | Default: false |
| contributionCount | integer | Default: 0 — number of products contributed |
| createdAt | timestamp | Default: CURRENT_TIMESTAMP |
| updatedAt | timestamp | Default: CURRENT_TIMESTAMP |

### 3.2 `products`
Food product database with full nutritional data.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | Auto-increment |
| barcode | text | NOT NULL, UNIQUE |
| name | text | NOT NULL |
| brand | text | Default: "" |
| category | text | Default: "" |
| servingSize | text | e.g., "100g", "1 cup" |
| calories | real | Nullable |
| protein | real | Nullable (grams) |
| carbohydrates | real | Nullable (grams) |
| sugar | real | Nullable (grams) |
| fat | real | Nullable (grams) |
| saturatedFat | real | Nullable (grams) |
| fiber | real | Nullable (grams) |
| sodium | real | Nullable (mg) |
| allergens | jsonb (string[]) | Default: [] — e.g., ["milk", "wheat", "soy"] |
| ingredients | text | Full ingredient list text |
| nutritionFacts | jsonb | Extended nutrition data (vitamins, minerals, etc.) |
| frontImageUrl | text | Product front photo URL |
| nutritionImageUrl | text | Nutrition label photo URL |
| contributedBy | integer | FK to users.id (nullable) |
| moderationStatus | text | "pending", "approved", "flagged" |
| reportCount | integer | Default: 0 — auto-flags at 3+ |
| scanCount | integer | Default: 0 — popularity counter |
| createdAt | timestamp | Default: CURRENT_TIMESTAMP |

**Indexes:** name, brand, category, barcode (unique)

### 3.3 `scan_history`
Every scan result a user has generated.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | integer | FK → users.id (CASCADE) |
| productId | integer | FK → products.id (CASCADE) |
| score | integer | NOT NULL (0–100) |
| adviceText | text | AI-generated dietary advice |
| headline | text | Short headline ("Great pick!", "Allergen detected") |
| coachTip | text | Actionable suggestion |
| highlights | jsonb (string[]) | Bullet-point insights |
| profileClusterId | text | Cluster active at scan time (for re-analysis) |
| accessMethod | text | "scan", "search", "popular" |
| createdAt | timestamp | |

**Indexes:** userId, productId

### 3.4 `daily_scan_tracker`
Enforces the free-tier daily scan limit (10 unique products/day).

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | integer | FK → users.id (CASCADE) |
| productId | integer | FK → products.id (CASCADE) |
| scanDate | text | YYYY-MM-DD format |

**Unique constraint:** (userId, productId, scanDate) — prevents double-counting

### 3.5 `advice_cache`
Caches AI-generated advice to reduce Gemini API calls.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| productId | integer | FK → products.id (CASCADE) |
| profileClusterId | text | NOT NULL — hash of user's health profile |
| adviceText | text | NOT NULL |
| highlights | jsonb (string[]) | |
| createdAt | timestamp | |
| expiresAt | timestamp | 90-day TTL from creation |

**Index:** (productId, profileClusterId) — lookup index

### 3.6 `scoring_rules`
Configurable rules for the health scoring engine.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| nutrient | text | "sugar", "sodium", "fiber", etc. |
| condition | text | "general_penalty", "diabetes_type2", "goal_weight_loss", etc. |
| lowerThreshold | real | Below this = no penalty |
| upperThreshold | real | Above this = max penalty |
| minDeduction | real | Minimum points deducted |
| maxDeduction | real | Maximum points deducted |
| isBonus | boolean | Default: false — true for positive nutrients |
| active | boolean | Default: true |

### 3.7 `conversations`
Chat system conversations with AI.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| title | text | NOT NULL |
| createdAt | timestamp | Default: now() |

### 3.8 `messages`
Individual messages within conversations.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| conversationId | integer | FK → conversations.id (CASCADE) |
| role | text | NOT NULL — "user" or "assistant" |
| content | text | NOT NULL |
| createdAt | timestamp | Default: now() |

---

## 4. Complete API Reference (24 Endpoints)

### 4.1 User Routes

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | /api/users | Create or find user by email | Upsert — returns existing if found |
| GET | /api/users/:id | Get user profile | 404 if not found |
| PUT | /api/users/:id/profile | Update profile + recompute cluster | Sets onboardingCompleted, updates profileClusterId |

### 4.2 Product Routes

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | /api/products/barcode/:barcode | Lookup by barcode | 404 if not found |
| GET | /api/products/search?q=&category=&limit= | Search by name/brand/category | ilike matching, ordered by scanCount |
| GET | /api/products/popular | Top 10 most scanned | Ordered by scanCount desc |
| GET | /api/products/categories | All unique categories | Filters nulls and empty strings |
| GET | /api/products/:id | Get product by ID | |
| POST | /api/products/contribute | User-submitted product | Checks for barcode duplicates, increments contributionCount |
| POST | /api/products/extract | AI nutrition extraction from photos | Uses Gemini vision on front+back images |
| POST | /api/products/:id/report | Report incorrect data | Auto-flags at reportCount >= 3 |

### 4.3 Scoring & AI

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | /api/score | Compute personalized score + AI advice | Enforces daily limit (10/day free), caches advice by cluster |

### 4.4 History Routes

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | /api/history/:userId | Paginated scan history | Sort: score_high, score_low, date. Search by product name |
| GET | /api/history/entry/:id | Single history entry | checkProfile=true triggers re-analysis if profile changed |
| DELETE | /api/history/:id | Delete one entry | |
| DELETE | /api/history/user/:userId/all | Clear all history | |

### 4.5 Stats & Metadata

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | /api/scans/today/:userId | Today's scan count | Returns { count, limit: 10 } |
| GET | /api/stats/:userId | Profile dashboard stats | totalScans, avgScore, weeklyScans, bestProducts, worstProducts |

### 4.6 Chat Routes

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | /api/conversations | List all conversations | |
| GET | /api/conversations/:id | Get conversation + messages | |
| POST | /api/conversations | Create new conversation | |
| DELETE | /api/conversations/:id | Delete conversation + messages | |
| POST | /api/conversations/:id/messages | Send message + stream AI reply | SSE streaming response |

### 4.7 Image Generation

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | /api/generate-image | Generate image from prompt | Uses gemini-2.5-flash-image model |

---

## 5. Scoring Engine — Deep Dive

### 5.1 Algorithm Flow
```
1. ALLERGEN CHECK → If user allergy matches product allergen → score = 0 (INSTANT)
2. BASE SCORE = 50
3. FETCH ACTIVE RULES from scoring_rules table
4. FILTER rules by user's conditions + goals
5. FOR EACH matching rule:
   - Get nutrient value from product
   - Apply interpolation (penalty or bonus)
   - Record deduction with reason
6. SPECIAL OVERRIDES:
   - Zero-calorie beverages → minimum score 92
   - Low-fiber penalty
7. NORMALIZE: round, clamp to [1, 100]
   (Note: 0 is EXCLUSIVELY for allergen matches)
```

### 5.2 Allergen Matching
The engine uses bidirectional allergen group matching:

```
ALLERGEN_GROUPS = {
  milk: ["lactose", "whey", "casein", "dairy", "cream", "butter", "cheese"],
  wheat: ["gluten", "flour", "semolina"],
  peanuts: ["peanut", "groundnut"],
  tree_nuts: ["almond", "cashew", "walnut", "pistachio", "hazelnut", "pecan", "macadamia"],
  soy: ["soya", "soybean", "edamame"],
  eggs: ["egg", "albumin", "mayonnaise"],
  fish: ["anchovy", "cod", "salmon", "tuna", "sardine"],
  shellfish: ["shrimp", "crab", "lobster", "prawn", "crawfish"],
}
```

A match occurs if:
- User allergy === product allergen (direct)
- User allergy group CONTAINS product allergen
- Product allergen group CONTAINS user allergy

### 5.3 Interpolation Functions
**Penalty (bad nutrients):**
- Below lowerThreshold → 0 penalty
- Above upperThreshold → maxDeduction
- Between → linear scale

**Bonus (good nutrients):**
- Rewards high protein, high fiber, or low levels of harmful nutrients

### 5.4 Profile Clustering
`computeClusterId()` creates a deterministic hash from:
1. Sorted conditions array
2. Sorted allergies array
3. Dietary preference
4. Health goal

Result: a short hex hash (e.g., "a1b2c3") used as cache key for AI advice. Users with identical health profiles share cached advice, dramatically reducing API costs.

### 5.5 Score Labels
| Score Range | Label |
|---|---|
| 0 | Allergen Alert |
| 1–15 | Strongly Avoid |
| 16–35 | High Risk |
| 36–50 | Caution |
| 51–74 | Moderate Fit |
| 75–85 | Good Fit |
| 86–100 | Excellent Fit |

---

## 6. AI Advice System

### 6.1 Model
Google Gemini 2.5 Flash via Replit AI Integrations (no direct API key needed — uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`).

### 6.2 Advice Generation (`getAdvice`)
1. **Cache lookup**: Check `advice_cache` for valid (non-expired) entry matching productId + profileClusterId
2. **Prompt building**: Construct detailed prompt with product data, user profile, score, and deductions
3. **AI call**: Send to Gemini with `responseMimeType: "application/json"` for structured output
4. **Parse + fallback**: Parse JSON response; use raw text as fallback if parsing fails
5. **Cache + return**: Save to database with 90-day expiry, return to client

### 6.3 Prompt Persona
The AI is instructed to behave as "FoodVAR — a warm, direct nutrition coach who talks like a smart friend." Key rules:
- No data dumps (don't repeat exact gram/mg values)
- "Rule of One" — focus on the single most important factor
- Maximum 2–3 sentences
- Actionable "Coach Tips" (e.g., "Try mustard instead")
- Category-aware (don't criticize a condiment for low protein)
- Allergen override (critical alert if allergen detected)

### 6.4 Nutrition Extraction from Images
The `extractNutritionFromImages` function uses Gemini's vision capabilities:
- Takes front + back photos (base64-encoded)
- Extracts: name, brand, category, serving size, core 8 macros, extended nutrition facts, full ingredients list
- Smart allergen inference: even if not explicitly labeled, infers allergens from ingredients (e.g., "chocolate" → milk)
- Returns structured JSON with all extracted data

### 6.5 Caching Strategy
- **Key**: productId + profileClusterId
- **TTL**: 90 days
- **Effect**: A diabetic user and a general-wellness user get different cached advice for the same product
- **Cost savings**: Eliminates redundant Gemini API calls for users with identical health profiles

---

## 7. Screen-by-Screen Breakdown

### 7.1 Onboarding (`app/onboarding.tsx`)
**Purpose:** First-time user registration and health profile setup.

**Flow (5 steps):**
1. **Step 0 — Identity**: Email + Name text inputs. Validates email format.
2. **Step 1 — Conditions**: Chip grid with 8 conditions (Diabetes Type 1/2, Hypertension, High Cholesterol, Kidney Disease, Gout, IBS, Celiac). Multi-select. "Other" option with free text.
3. **Step 2 — Allergies**: Chip grid with common allergens (Peanuts, Tree Nuts, Milk, Eggs, Wheat, Soy, Fish, Shellfish, Sesame). Multi-select. "Other" option.
4. **Step 3 — Goal**: Large selection cards (Lose Weight, Build Muscle, General Wellness, Manage Condition). Single select.
5. **Step 4 — Diet & Age**: Dietary preference picker (None, Vegetarian, Vegan, Halal, Kosher, Gluten-Free) + Age input.

**UI Details:**
- Progress bar at top showing completion
- Animated transitions between steps (Moti/Reanimated)
- "Back" and "Next" navigation buttons
- Final step triggers `login()` + `updateProfile()` via UserContext
- On completion, sets `onboardingCompleted: true` and navigates to main tabs

### 7.2 Home Screen (`app/(tabs)/index.tsx`)
**Purpose:** Dashboard showing user stats, recent activity, and trending products.

**Layout (top to bottom):**
1. **Header**: Personalized greeting ("Good morning, [Name]"), avatar with scan-count badge
2. **Progress Bar**: Edge-to-edge 3px animated bar showing daily scan progress (X/10)
3. **Hero Banner**: Green-tinted CTA card encouraging scanning, with scan icon
4. **Stats Row**: Two stat widgets — "Avg Score" (color-coded) and "Today's Scans" with gradient icon backgrounds
5. **Insight Card**: Border-only card with AI-style insight text about the user's profile
6. **Recent Scans**: Horizontal ScrollView of circular score badges with colored bottom ribbons, product name + brand
7. **Popular Products**: Single card with divider-separated product rows, each showing score badge + name + brand + calories
8. **Contribute Card**: Dashed-border card encouraging product contributions

**Data Sources:**
- `GET /api/stats/:userId` — totalScans, avgScore, weeklyScans
- `GET /api/scans/today/:userId` — today's count
- `GET /api/history/:userId?limit=10` — recent scans
- `GET /api/products/popular` — trending products

**Interactions:**
- Pull-to-refresh
- Tap recent scan → navigate to `/result?historyId=X`
- Tap popular product → navigate to `/result?productId=X`
- Tap "See all" → navigate to History tab
- Tap contribute card → navigate to `/contribute`

### 7.3 Scan Screen (`app/(tabs)/scan.tsx`)
**Purpose:** Product lookup via barcode scanner or text search.

**Two modes (toggle):**

**Search Mode:**
- Text input with search icon
- Debounced API calls to `GET /api/products/search?q=...`
- FlatList of matching products with name, brand, category
- Tap product → navigate to `/result?productId=X`
- "Not found? Contribute" link

**Scanner Mode:**
- Full-screen camera view using `expo-camera`
- Animated scanning frame overlay with sweep line
- Real-time barcode detection
- On scan: lookup via `GET /api/products/barcode/:barcode`
  - Found → navigate to `/result?productId=X`
  - Not found → prompt to contribute with pre-filled barcode

**UI Details:**
- Toggle between Search/Scanner at the top
- Scanner has haptic feedback on successful scan
- Flash/torch toggle button
- Permission handling for camera access

### 7.4 Result Screen (`app/result.tsx`)
**Purpose:** Detailed health analysis of a specific product, personalized to the user.

**Presented as:** Modal (slide-from-bottom animation)

**Layout:**
1. **Score Ring**: Large SVG gauge (240px) with animated stroke. Score number (64pt font) in center. Color-coded by range.
2. **Score Label**: Text like "Good Fit" or "Allergen Alert" with colored badge
3. **Product Info**: Name + Brand below the ring
4. **AI Headline**: Bold personalized headline (e.g., "Watch the sodium!")
5. **AI Advice**: 2-3 sentence personalized dietary guidance
6. **Coach Tip**: Actionable suggestion in a highlighted card
7. **Highlights**: Bullet-point list of key insights (positive in green, negative in red)
8. **Nutrition Table**: Full breakdown with color-coded bars relative to daily values:
   - Calories, Protein, Carbs, Sugar, Fat, Saturated Fat, Fiber, Sodium
   - Extended facts if available (Trans fat, Cholesterol, Vitamins, etc.)
9. **Actions**: Share button, "Report incorrect data" link

**Data Sources:**
- New scan: `POST /api/score` (computes score + generates AI advice)
- From history: `GET /api/history/entry/:id?checkProfile=true` (re-analyzes if profile changed)

**Special Behaviors:**
- If `checkProfile=true` and user's profile cluster has changed since the original scan, the server automatically re-runs scoring and AI advice, returning fresh results
- Allergen Alert: If score = 0, shows prominent red warning with matched allergen names
- Loading state: Animated pulsing dots while AI generates advice

### 7.5 History Screen (`app/(tabs)/history.tsx`)
**Purpose:** Chronological log of all user scans.

**Layout:**
1. **Search bar**: Filter by product name
2. **Sort chips**: "Recent" (default), "Best" (score_high), "Worst" (score_low)
3. **Grouped FlatList**: Entries grouped by date (Today, Yesterday, This Week, etc.)
4. **Each entry**: Score badge (color-coded) + Product name + Brand + Timestamp

**Interactions:**
- Tap entry → navigate to `/result?historyId=X`
- Long-press entry → delete confirmation dialog
- Pull-to-refresh
- Pagination (offset-based)

**Data Source:** `GET /api/history/:userId?sort=&search=&limit=&offset=`

### 7.6 Profile Screen (`app/(tabs)/profile.tsx`)
**Purpose:** User identity, health passport, and aggregate statistics.

**Layout (Card-Grid Design):**
1. **Minimal Top Bar**: "[Name]'s Profile" title + gear settings icon
2. **Identity Card**: Avatar circle (gradient green, initial letter) + Name + Email + Age + "Edit" link
3. **Stat Widgets (3x)**: Square cards in a row:
   - Total Scans (green scan icon, top-right)
   - Avg Score (color-coded speedometer icon)
   - This Week (teal calendar icon)
4. **Health Passport Card**: Shield icon + "Health Passport" title + accent dot. Vertical rows:
   - CONDITIONS: Gradient red icon bg + Heartbeat icon
   - ALLERGIES: Gradient orange icon bg + Warning icon
   - GOAL: Gradient green icon bg + Flag icon
   - DIET: Gradient teal icon bg + Leaf icon (if set)
5. **Performance Cards (2x side-by-side)**:
   - "Best Picks" (trophy icon, green) — top 3 products with score badges
   - "Avoid" (fire icon, red) — bottom 3 products with score badges
6. **Action Cards**:
   - "Edit Health Profile" — white card, green left border, chevron arrow
   - "Log Out" — white card, red left border, red text

**Interactions:**
- Tap identity card → inline edit mode (name + age inputs with save/cancel)
- Tap gear icon → navigate to `/edit-profile`
- Tap "Edit Health Profile" → navigate to `/edit-profile`
- Tap "Log Out" → confirmation dialog → clear session → redirect to onboarding

### 7.7 Edit Profile Screen (`app/edit-profile.tsx`)
**Purpose:** Update health conditions, allergies, goal, and diet.

**Presented as:** Modal (slide-from-bottom)

**Layout:** Similar to onboarding steps 1-4, but pre-filled with current values. Allows modifying:
- Health conditions (chip grid)
- Allergies (chip grid)
- Health goal (card selection)
- Dietary preference (picker)
- Age (text input)

**Behavior:** On save, triggers `updateProfile()` which recomputes the profileClusterId, meaning future scans and cached advice will reflect the new profile.

### 7.8 Contribute Screen (`app/contribute.tsx`)
**Purpose:** User-submitted new products via AI-powered photo analysis.

**Presented as:** Modal (slide-from-bottom)

**Flow:**
1. **Step 1**: Capture/select front-of-package photo (expo-image-picker)
2. **Step 2**: Capture/select nutrition label photo
3. **Analysis**: Animated loading state while AI extracts nutrition data (`POST /api/products/extract`)
4. **Review**: Shows extracted data for user confirmation
5. **Submit**: Creates product via `POST /api/products/contribute`
6. **Success**: Animated confetti, then redirects to `/result?productId=X`

---

## 8. Navigation Map

```
app/
├── _layout.tsx              ← Root Stack Navigator
│   ├── (tabs)/              ← Tab Navigator (protected — requires onboarding)
│   │   ├── _layout.tsx      ← Tab bar configuration (Minimal Edge design)
│   │   ├── index.tsx        ← Home (Tab 1)
│   │   ├── scan.tsx         ← Scan (Tab 2 — green pill button)
│   │   ├── history.tsx      ← History (Tab 3)
│   │   └── profile.tsx      ← Profile (Tab 4)
│   ├── onboarding.tsx       ← Full-screen (no tabs)
│   ├── result.tsx           ← Modal (slide-from-bottom)
│   ├── contribute.tsx       ← Modal (slide-from-bottom)
│   └── edit-profile.tsx     ← Modal (slide-from-bottom)
```

**Auth Flow:**
```
App Launch → Load user from AsyncStorage
  → User exists + onboarding complete → Tabs (Home)
  → No user OR onboarding incomplete → Onboarding
```

---

## 9. State Management

### 9.1 UserContext (Global State)
- **Source**: `contexts/UserContext.tsx`
- **Provider**: Wraps entire app in `app/_layout.tsx`
- **State**: `user` (UserProfile | null), `isLoading` (boolean)
- **Functions**:
  - `login(email, name)` — POST /api/users, save ID to AsyncStorage
  - `updateProfile(data)` — PUT /api/users/:id/profile, recompute cluster
  - `logout()` — clear AsyncStorage, set user to null
  - `refreshUser()` — re-fetch from server
- **Persistence**: User ID stored in AsyncStorage under key `"foodvar_user_id"`

### 9.2 TanStack Query (Server State)
- **Source**: `lib/query-client.ts`
- **Configuration**:
  - `staleTime: Infinity` — data is fresh until manually invalidated
  - `retry: false` — no automatic retries
  - `refetchOnWindowFocus: false` — no background re-fetching
- **Global Query Function**: Routes based on queryKey array (e.g., `["/api/stats", userId]` → `GET /api/stats/:userId`)
- **Mutations**: Use `apiRequest()` helper, then invalidate relevant query keys

### 9.3 Local State
- `useState` for form inputs, toggle states, search queries
- No Redux, no Zustand, no external state libraries

---

## 10. Design System

### 10.1 Color Tokens (`constants/colors.ts`)

| Token | Value | Usage |
|---|---|---|
| C.bg | #F6F8F7 | Page background |
| C.card | #FFFFFF | Card backgrounds |
| C.primary | #2E7D32 | Primary green (buttons, active states) |
| C.mint | #3DD68C | Accent green (gradients, badges) |
| C.teal | #2EC4B6 | Secondary accent (teal scores, highlights) |
| C.text | #1B1B1B | Primary text |
| C.muted | #666666 | Secondary text |
| C.placeholder | #999999 | Placeholder/disabled text |
| C.border | rgba(0,0,0,0.07) | Card borders |
| C.divider | #F0F0F0 | Separator lines |
| C.danger | #E53935 | Red alerts, allergens |
| C.dangerBg | #FFEBEE | Red background tint |
| C.amber | #FB8C00 | Caution scores |
| C.amberBg | #FFF3E0 | Amber background tint |
| C.green | #43A047 | Good scores |
| C.greenBg | #E8F5E9 | Green background tint |
| C.tealScore | #2EC4B6 | Moderate scores |
| C.tealBg | #E0F7FA | Teal background tint |

### 10.2 Score Colors
| Range | Color | Background | Label |
|---|---|---|---|
| 0 | #E53935 | #FFEBEE | Allergen |
| 1–15 | #D32F2F | #FFE8E8 | Avoid |
| 16–35 | #E53935 | #FFEBEE | Risky |
| 36–50 | #FB8C00 | #FFF3E0 | Caution |
| 51–74 | #2EC4B6 | #E0F7FA | Good |
| 75–100 | #43A047 | #E8F5E9 | Great |

### 10.3 Shadow System
Three tiers via `cardShadow()`:
- **subtle**: shadowOpacity 0.04, radius 4 (background cards)
- **medium**: shadowOpacity 0.06, radius 8 (interactive cards)
- **strong**: shadowOpacity 0.08, radius 16 (floating elements)

Also `coloredShadow(color)` for tinted shadows (e.g., green shadow on CTA buttons).

### 10.4 Card System
All cards use:
- `borderRadius: 20`
- `backgroundColor: C.card` (#FFFFFF)
- `borderWidth: 1, borderColor: C.border`
- Appropriate shadow tier
- `padding: 14-18` depending on content density

### 10.5 Typography
- **Icons**: phosphor-react-native (all screens)
- **Animations**: react-native-reanimated (FadeInDown, layout animations), moti (skeleton loaders)
- **Gradients**: expo-linear-gradient (headers, avatars, CTA buttons, icon backgrounds)

### 10.6 Tab Bar (Minimal Edge Design)
- Flush bottom bar (no floating pill)
- Height: 56px + safe area bottom padding
- Thin 1px top border (rgba(0,0,0,0.06))
- Center: inline green gradient pill (120x40px) with barcode icon + "Scan" text
- Active tab: green filled icon + small label below
- Inactive tab: grey regular icon, no label
- Haptic feedback on scan button press

---

## 11. Key Libraries & Dependencies

### Frontend (Expo)
| Library | Version | Purpose |
|---|---|---|
| expo | 54 | Mobile framework |
| expo-router | 6 | File-based navigation |
| @tanstack/react-query | 5 | Server state management |
| react-native-reanimated | — | Animations (FadeInDown, shared values) |
| moti | — | Declarative animations, skeleton loaders |
| phosphor-react-native | — | Icon library (replaces @expo/vector-icons) |
| expo-camera | — | Barcode scanning |
| expo-image-picker | — | Photo capture for contributions |
| expo-haptics | — | Tactile feedback |
| expo-linear-gradient | — | UI gradients |
| @react-native-async-storage/async-storage | — | Local session persistence |
| react-native-keyboard-controller | — | Keyboard handling |

### Backend (Express)
| Library | Version | Purpose |
|---|---|---|
| express | 5 | HTTP server |
| drizzle-orm | — | Type-safe PostgreSQL ORM |
| drizzle-zod | — | Schema validation |
| pg | — | PostgreSQL client |
| @google/genai | — | Gemini AI SDK |
| p-limit | — | Concurrency control for batch AI |
| p-retry | — | Retry with exponential backoff |
| esbuild | — | Production server bundling |

---

## 12. Environment Variables

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| AI_INTEGRATIONS_GEMINI_API_KEY | Gemini API key (via Replit integrations) |
| AI_INTEGRATIONS_GEMINI_BASE_URL | Gemini API base URL |
| EXPO_PUBLIC_DOMAIN | Domain for API requests from mobile app |
| REPLIT_DEV_DOMAIN | Replit development domain (auto-set) |
| REPLIT_DOMAINS | Replit deployment domains (auto-set) |
| SESSION_SECRET | Session secret key |
| PORT | Server port (default: 5000) |

---

## 13. Build & Deployment

### Development
- **Frontend**: `npm run expo:dev` → Expo dev server on port 8081 with HMR
- **Backend**: `npm run server:dev` → Express via tsx on port 5000

### Production Build
1. `npm run expo:static:build` → Runs `scripts/build.js`:
   - Starts Metro bundler in production mode
   - Downloads compiled JS bundles for iOS + Android
   - Extracts all assets (images, fonts)
   - Generates platform-specific manifests
   - Outputs to `static-build/` directory
2. `npm run server:build` → esbuild bundles Express to `server_dist/`
3. `npm run server:prod` → Runs bundled server in NODE_ENV=production
4. `npm run db:push` → drizzle-kit push for schema sync

### Production Server Responsibilities
The single Express server handles:
- API requests (/api/*)
- Expo manifests (for Expo Go app loading)
- Static JS bundles and assets
- Landing page with QR code for Expo Go

---

## 14. Replit AI Integrations

### 14.1 Chat System
- **Model**: gemini-2.5-flash
- Full CRUD for conversations and messages
- SSE streaming for real-time AI responses
- Persistent storage in PostgreSQL

### 14.2 Image Generation
- **Model**: gemini-2.5-flash-image
- Text-to-image generation
- Returns base64-encoded images

### 14.3 Batch Processing
- Concurrent processing with `p-limit` (default: 2 concurrent)
- Retry with exponential backoff via `p-retry` (up to 7 retries)
- Rate limit detection (429 status / quota exceeded)
- SSE progress streaming for long-running tasks

---

## 15. Error Handling & Resilience

### Frontend
- **ErrorBoundary** (class component): Catches rendering errors, shows ErrorFallback
- **ErrorFallback**: "Something went wrong" screen with "Try Again" button (uses `reloadAppAsync()`)
- Dev mode: shows full error + stack trace in modal
- Dark/light mode support via `useColorScheme`

### Backend
- All routes wrapped in try/catch with appropriate HTTP status codes
- `throwIfResNotOk()` standardizes error responses across the API client
- Allergen detection is fail-safe (always returns score=0 on match, never crashes)
- AI advice has fallback (raw text if JSON parsing fails)

---

## 16. Security & Access Control

### Free Tier Limits
- 10 unique product scans per day (tracked by `daily_scan_tracker`)
- Pro users (`isPro: true`) bypass this limit
- Returns 429 status when limit reached

### Data Protection
- User sessions persisted locally via AsyncStorage (ID only, not credentials)
- CORS whitelist based on Replit environment variables
- Credentials included in all API requests
- Product moderation: community reporting auto-flags at 3+ reports

### Content Moderation
- User-contributed products start as `moderationStatus: "pending"`
- Report endpoint increments `reportCount`
- Auto-flags products when `reportCount >= 3`

---

## 17. User Journey Map

```
                        ┌─────────────┐
                        │  App Launch  │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │  Has saved user ID? │
                    └──────────┬──────────┘
                         No    │    Yes
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌─────────────┐    ┌─────────────────┐
             │ Onboarding  │    │ Fetch user from  │
             │ (5 steps)   │    │ server           │
             └──────┬──────┘    └────────┬────────┘
                    │                    │
                    │            ┌───────▼────────┐
                    │            │ Onboarding     │
                    │            │ completed?     │
                    │            └───────┬────────┘
                    │              No    │   Yes
                    │            ┌───────┴────────┐
                    ▼            ▼                ▼
             ┌─────────────┐              ┌─────────────┐
             │  Complete   │              │  HOME TAB   │
             │  profile    │              │  Dashboard  │
             └──────┬──────┘              └──────┬──────┘
                    │                            │
                    ▼                     ┌──────┴──────┐
             ┌─────────────┐              │             │
             │  HOME TAB   │     ┌────────▼─┐  ┌───────▼──────┐
             │  Dashboard  │     │ SCAN TAB │  │ HISTORY TAB  │
             └─────────────┘     │ Search/  │  │ Past scans   │
                                 │ Camera   │  │ Sort/Filter  │
                                 └────┬─────┘  └──────┬───────┘
                                      │               │
                              ┌───────▼───────┐       │
                              │ Product found?│       │
                              └───────┬───────┘       │
                                Yes   │   No          │
                              ┌───────┴───────┐       │
                              ▼               ▼       │
                       ┌────────────┐  ┌───────────┐  │
                       │  RESULT    │  │ CONTRIBUTE │  │
                       │  Score +   │  │ Photo AI   │  │
                       │  AI Advice │  │ extraction │  │
                       └────────────┘  └─────┬─────┘  │
                                             │        │
                                             ▼        │
                                      ┌────────────┐  │
                                      │  RESULT    │◄─┘
                                      │  (new      │
                                      │  product)  │
                                      └────────────┘
```

---

## 18. Feature Summary Matrix

| Feature | Status | Details |
|---|---|---|
| User registration | Done | Email-based, upsert pattern |
| Health onboarding | Done | 5-step wizard with conditions, allergies, goals, diet |
| Barcode scanning | Done | expo-camera, real-time detection |
| Product search | Done | Name/brand/category with ilike matching |
| Personalized scoring | Done | 0-100, allergen check, interpolation rules |
| AI dietary advice | Done | Gemini 2.5 Flash, cached 90 days |
| Nutrition extraction | Done | Gemini vision on front+back photos |
| Scan history | Done | Paginated, sortable, searchable, grouped by date |
| Profile management | Done | Inline edit, full edit modal, cluster recomputation |
| Profile re-analysis | Done | Auto-refreshes scores when profile changes |
| Product contribution | Done | AI-powered photo extraction flow |
| Product reporting | Done | Community reporting, auto-flag at 3+ |
| Free tier limits | Done | 10 scans/day, tracked per unique product |
| Pro tier | Partial | isPro flag exists, bypass limit implemented, no payment flow |
| AI Chat | Done | Multi-turn conversations, SSE streaming |
| Image generation | Done | Text-to-image via Gemini |
| Landing page | Done | QR code for Expo Go, platform detection |
| Dark mode | Partial | Error fallback only; main app is light-only |
| Offline support | No | All features require network |
| Push notifications | No | Not implemented |
| Social features | No | No sharing, following, or community feed |

---

*Report generated March 13, 2026. Covers the complete FoodVAR codebase as of the current commit.*
