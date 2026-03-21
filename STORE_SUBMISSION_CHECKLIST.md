# FoodVAR — App Store & Google Play Submission Checklist

## Pre-Build

- [ ] Set Apple Team ID, App Store Connect App ID in `eas.json` → `submit.production.ios`
- [ ] Set Google Play service account key path in `eas.json` → `submit.production.android`
- [ ] Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` for production Google OAuth
- [ ] Verify `EXPO_PUBLIC_SENTRY_DSN` is set for production
- [ ] Verify `EXPO_PUBLIC_DOMAIN` points to production deployment URL
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run typecheck` — no type errors

## EAS Build

- [ ] Run `eas build --profile production --platform ios`
- [ ] Run `eas build --profile production --platform android`
- [ ] Test production build on physical device before submission

## App Store (iOS)

### App Information
- [ ] App name: FoodVAR
- [ ] Subtitle: "Personalized Food Wellness Scores"
- [ ] Category: Primary — Health & Fitness; Secondary — Food & Drink
- [ ] Content rating: 4+ (no objectionable content)
- [ ] Age rating questionnaire: No medical/treatment content, no user-generated content visible to others

### Privacy Questionnaire (App Privacy)
- [ ] Data types collected:
  - Contact Info: Email address (for account)
  - Health & Fitness: Health conditions, allergies (for score personalization)
  - Identifiers: User ID
  - Usage Data: Product scan history
- [ ] Data linked to user: Email, health profile, scan history
- [ ] Data used for tracking: None
- [ ] Third-party data sharing: Google Gemini (anonymized nutrition context only — no PII)

### Sign-In Review Notes
Provide these notes to Apple's review team:
```
FoodVAR uses Apple Sign-In as the primary iOS authentication method alongside Google Sign-In.
Sign-In with Apple is required because the app collects health profile data (conditions, allergies)
to compute personalized food wellness scores. No email/password authentication is offered.

To test the app:
1. Sign in with Apple or Google
2. Complete onboarding (select health conditions, allergies, goal)
3. Use the Scan tab to scan a barcode or search for a product
4. View the personalized wellness score and AI-generated dietary guidance

The app does NOT provide medical advice, diagnosis, or treatment.
All scores and guidance are for general wellness information only.
```

### Screenshots
- [ ] 6.7" (iPhone 15 Pro Max): Onboarding, Home, Scan, Result, Profile — 5 screenshots minimum
- [ ] 6.5" (iPhone 14 Plus): Same set
- [ ] 5.5" (iPhone 8 Plus): Same set (if supporting older devices)
- [ ] iPad: Not required (app does not support tablet — `supportsTablet: false`)

### Required Disclaimers
- [ ] App description includes: "FoodVAR is not a medical device. Scores and guidance are for informational purposes only."
- [ ] Medical disclaimer is visible in Terms of Service (Section 3)
- [ ] AI disclaimer is visible in Terms of Service (Section 4)
- [ ] Allergen safety warning is visible in Terms of Service (Section 5)

## Google Play

### Store Listing
- [ ] App name: FoodVAR
- [ ] Short description: "Scan food products and get personalized wellness scores based on your health profile."
- [ ] Full description includes wellness positioning and medical disclaimer
- [ ] Category: Health & Fitness
- [ ] Content rating: IARC questionnaire completed

### Data Safety
- [ ] Data collected: Email, name, age, health conditions, allergies, scan history
- [ ] Data shared: Anonymized nutrition context sent to AI service (Google Gemini)
- [ ] Data encrypted in transit: Yes (HTTPS)
- [ ] Data deletion: Available via Profile → Delete Account
- [ ] Data export: Available via Profile → Export My Data

### Privacy Policy
- [ ] Privacy policy URL set in Play Console (host the content of `app/privacy.tsx`)
- [ ] Privacy policy accessible in-app from Profile screen

### Account Deletion
- [ ] Account deletion accessible from Profile → Delete Account
- [ ] Deletion is permanent and removes all user data
- [ ] Google Play requires this to be reachable within 2 taps from settings

## Third-Party Data Sources
- [ ] FatSecret API: Used for barcode product lookup. Products are food database entries (name, brand, nutrition). No user data is sent to FatSecret.
- [ ] Google Gemini AI: Used for dietary guidance generation. Receives anonymized product nutrition data and health profile categories (conditions, allergies, goal). No PII (name, email) is included.
- [ ] Sentry: Error monitoring. Receives crash reports and error context. PII sending is disabled.

## Post-Submission
- [ ] Monitor Sentry for production crashes after first users
- [ ] Monitor App Store Connect / Play Console for review feedback
- [ ] Respond to any reviewer questions within 24 hours
