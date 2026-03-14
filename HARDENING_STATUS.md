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
- Score badges show visible text labels alongside numeric values (non-color-only meaning) on:
  - Home screen (ScoreBadgeCircle: score number + tier text)
  - Profile screen (best/worst product badges: score number + tier text)
  - History screen (score badge + tier label)
  - Result screen (score ring with tier label)
- Dark mode: `useThemeColors()` hook in `constants/colors.ts` with light + dark token sets.
  - StatusBar set to `auto` (adapts to system theme).
  - All screens call `useThemeColors()` and apply `theme.bg` to containers, `theme.text`/`theme.muted`/`theme.placeholder` to key text and icons, `theme.card` to card backgrounds, `theme.border`/`theme.divider` to separators.
  - Migrated screens: tab bar, Home, History, Profile, Result, Scan, Onboarding, Contribute, Edit Profile, Privacy, Terms.
  - Gradients and accent colors remain fixed (brand identity); structural elements (backgrounds, text, cards, borders) adapt to dark mode.
- Accessibility labels and roles on all core interactive elements:
  - Tab bar items (Home, Scan, History, Profile tabs)
  - History items (product name, score, tier, time)
  - Profile best/worst product rows (product name, score, tier), edit profile button, privacy/terms/export/delete actions
  - Onboarding: back button, progress bar, step indicator, consent checkbox, privacy/terms links, next/continue button, condition/allergy/goal/diet selection chips
  - Scan: mode toggles (search/scanner), search input, clear search button
  - Result: close button, share button, score ring
  - Edit Profile: close button, condition/allergy checkboxes, goal/diet radio selectors
  - Contribute: close button
  - Privacy/Terms: back buttons
- 83 unit tests passing (5 label consistency tests).
