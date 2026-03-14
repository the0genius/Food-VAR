# FoodVAR Hardening Status

## Known Tradeoffs & Limitations

### Web Auth Storage
On native platforms (iOS/Android), auth tokens are stored in SecureStore (encrypted, OS-level keychain).
On web, tokens are stored in AsyncStorage (which uses localStorage under the hood). This means:
- Tokens are accessible to any JavaScript running on the page (XSS risk).
- Mitigation: CSP headers via Helmet, no inline scripts, no third-party scripts.
- **Recommended production fix**: Move to httpOnly cookie-based sessions for web, or use a BFF (Backend-for-Frontend) pattern. This requires server-side session management changes.

### Email Delivery
Email verification and password reset tokens are generated and stored server-side with hashed values. However, **no email provider is integrated** — tokens are logged to the console in development mode only. To enable email delivery:
1. Integrate an email service (SendGrid, Postmark, Resend, AWS SES).
2. Replace dev-only token logging with actual email sends.
3. Add email templates for verification and password reset flows.

### Rate Limiting
Rate limits are IP-based via `express-rate-limit`. Behind a load balancer or proxy, ensure `trust proxy` is configured correctly so rate limiting works on real client IPs rather than the proxy IP.

### AI Safety
AI advice includes medical disclaimers and prompt hardening. However:
- Chat feature is disabled by default (ENABLE_CHAT=false) — no system prompt guardrails.
- Image generation is disabled by default (ENABLE_IMAGE_GENERATION=false) — no content moderation.
- Enable these features only after adding appropriate safety measures.

### Score Labels & Accessibility (Task #5)
- Score labels are unified via `shared/score-labels.ts` — single source of truth for both backend and frontend.
- Full labels (e.g., "Consume with Caution") used in API responses; short labels (e.g., "Caution") used in UI badges.
- No local duplicate label functions — all screens consume shared module only.
- Allergen-aware labels: Home/history/profile pass `isAllergenAlert: score === 0` to `getScoreShortLabel()` so score-0 entries show "Allergen" not "Avoid" (consistent with scoring engine design where score 0 exclusively indicates allergen match).
- Score badges show visible text labels alongside numeric values (non-color-only meaning) on:
  - Home screen (ScoreBadgeCircle: score number + tier text)
  - Profile screen (best/worst product badges: score number + tier text)
  - History screen (score badge + tier label)
  - Result screen (score ring with tier label)
- Dark mode: Full `createStyles(theme)` factory pattern — zero hardcoded neutral colors in StyleSheets.
  - `useThemeColors()` hook in `constants/colors.ts` provides light + dark token sets (30+ tokens).
  - All 11 app files (10 screens + tab layout) use `const createStyles = (theme: ThemeColors) => StyleSheet.create({...})` with `useMemo(() => createStyles(theme), [theme])` inside the component.
  - Sub-components that need `styles` are defined inside the parent component (not at module level), so they capture the themed styles via closure.
  - StatusBar set to `auto` (adapts to system theme).
  - Migrated files: `_layout.tsx` (tab bar), Home, History, Profile, Result, Scan, Onboarding, Contribute, Edit Profile, Privacy, Terms.
  - Skeleton loading colors, muted icons, score backgrounds, warning boxes, info badges, neutral chips — all use theme tokens with dark-mode variants.
  - `getScoreColor()` and `getScoreBgColor()` accept optional ThemeColors parameter for dark-mode-aware score coloring.
  - Gradients and accent colors remain fixed (brand identity); structural elements (backgrounds, text, cards, borders) adapt to dark mode.
- Accessibility labels and roles on all core interactive elements:
  - Tab bar items (Home, Scan, History, Profile tabs)
  - Home: "Scan a product" CTA, "See all scan history" link, recent scan cards (product name + score + tier), popular product cards (name + brand), "Add a missing product" contribute card
  - History: history items (product name, score, tier, time), sort chips, empty-state "Scan a Product" CTA, error retry button
  - Profile: edit profile button, identity card, cancel/save edit buttons, privacy/terms/export/logout/delete actions, best/worst product rows
  - Onboarding: back button, progress bar, step indicator, consent checkbox, privacy/terms links, next/continue button, condition/allergy/goal/diet selection chips, auth mode toggle (sign in/sign up), skip button, email/password/name/age text inputs
  - Scan: mode toggles (search/scanner with selected state), search input, clear search, search result rows (name + brand + category), "Add a product" empty-state CTA, camera permission button, manual barcode entry, barcode lookup
  - Result: close/back buttons on all states (limit, error, allergen, normal), share button, "Scan another" CTAs (both allergen and normal views), "View full nutrition label" toggle, limit "Go Back" button, error retry
  - Edit Profile: close button, header save button, bottom save CTA, condition/allergy checkboxes, goal/diet radio selectors
  - Contribute: close button, front/back camera capture buttons, retry button, cancel button
  - Privacy/Terms: back buttons
- Zero app-level TypeScript errors (all remaining TS errors are pre-existing server/mockup-sandbox issues).
- 83 unit tests passing (5 label consistency tests).
