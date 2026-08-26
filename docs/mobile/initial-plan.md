# Addis Tiggena — Android Apps (Customer + Provider)

React Native via **Expo** (decision rationale in `docs/02-tech-stack.md`). The mobile workspace is
initialized in Week 3 by the mobile developer; it is not part of the npm-workspaces install because
Expo manages its own toolchain.

## Initialize (Week 3, Day 1)

```bash
cd apps/mobile
npx create-expo-app customer --template blank-typescript
npx create-expo-app provider --template blank-typescript
```

## Required Expo modules

| Need (proposal §5) | Package |
| --- | --- |
| GPS pinning & live tracking | `expo-location`, `expo-task-manager` (background), `react-native-maps` |
| Push notifications | `expo-notifications` (FCM) |
| Offline cache & queued actions | `expo-sqlite`, `@tanstack/react-query` persistors |
| OTP autofill | `expo-sms-retriever` (Android SMS Retriever API) |
| Photo evidence / portfolio upload | `expo-image-picker` + pre-signed OBS URLs |

## App skeletons

- **customer**: auth (OTP) → category grid → map pin + landmark note → provider list → booking
  status/tracking screen → payment sheet → rating.
- **provider**: auth → verification status → availability toggle → job inbox (90s countdown) →
  navigation hand-off (Google Maps intent) → job lifecycle buttons → earnings dashboard.

Both apps consume the REST API defined in `docs/04-architecture.md` and share the Socket.IO
tracking namespace. Amharic-first: default locale `am`, English toggle (proposal §6.1).
