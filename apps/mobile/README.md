# Addis Tiggena — Mobile app (Expo / React Native)

Native Android/iOS app for customers **and** technicians, talking to the same production
API as the web app (`https://api.addistiggena.com`). One login screen; the account's
role decides the experience:

- **Customer**: home with category grid → 4-step booking wizard (GPS pin, sub-city,
  problem photo) → live booking tracking (dispatch countdown, ETA, timeline) → cash
  payment confirm → rating → "Something's wrong" / 5-day guarantee claims.
- **Technician**: online/offline toggle (with GPS ping for dispatch ranking), incoming
  job offers on the 5-minute countdown, one-tap lifecycle (accept → en route → arrived
  → start → complete with final price), earnings wallet + payout requests.

## Stack

- Expo SDK 54 + expo-router (file-based navigation, typed routes)
- TypeScript, React Native StyleSheet (design tokens in `src/lib/theme.ts` mirror the
  web design system: Deep Navy `#0b1e3f`, Vibrant Blue `#0072ce`, Montserrat / Inter /
  Noto Sans Ethiopic)
- `expo-secure-store` for JWT storage (access + refresh, silent refresh on 401)
- `expo-location` (booking pin + technician availability ping), `expo-image-picker`
  (problem photo upload)

## Structure

```
src/
  app/                 expo-router routes
    welcome.tsx        onboarding (role pick)
    login.tsx          phone-OTP + username/password
    (customer)/        tabs: home, book, bookings, profile
    (tech)/            tabs: jobs, wallet, profile
    booking/[id].tsx   live booking detail (both roles land here from lists)
  components/ui.tsx    UI kit: Btn, Card, Field, StatusPill, Countdown, …
  lib/api.ts           fetch wrapper + types (same contract as apps/web/lib/api.ts)
  lib/theme.ts         design tokens
  lib/catalog.ts       category icons, sub-cities, status timeline copy
  store/auth.tsx       AuthProvider (SecureStore-backed session)
```

## Run it (development)

```bash
cd apps/mobile
npm install
npm start          # Expo dev server → scan the QR with the Expo Go app
```

Point at a different API with an env var:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:4001 npm start   # local API on your LAN
```

(Default is the production API, so Expo Go on any phone works out of the box.)

## Build an installable APK / AAB

Uses [EAS Build](https://docs.expo.dev/build/setup/) (free tier is fine):

```bash
npm i -g eas-cli
eas login                       # expo.dev account
eas build -p android --profile preview    # APK for direct install / client demo
eas build -p android --profile production # AAB for Google Play
```

`android.package` is `com.amnen.addistiggena`. iOS builds need an Apple Developer
account (`eas build -p ios`).

## Notes

- Technician document upload (vetting) stays on the web dashboard; the app shows
  verification status and blocks going online until VERIFIED.
- Push notifications (FCM) are the next milestone — dispatch offers currently surface
  via the 6-second job-board poll while the app is open.
