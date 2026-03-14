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
