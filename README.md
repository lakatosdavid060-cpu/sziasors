# SziaSors

A Next.js 15 + Firebase Realtime Database + WebRTC browser-based random video chat starter for Hungarian users, with county filtering and Cloudflare Realtime TURN.

This is a **starter project, not a fully audited production service**. It needs configuration, deployment, testing, abuse controls and a safeguarding/legal review before public launch.

## What runs where?

- **Vercel:** hosts the website and Next.js API routes. No always-on home computer/server is needed.
- **Firebase Realtime Database:** stores queue, matches, signaling and chat data.
- **Firebase Anonymous Authentication:** gives browser users pseudonymous Firebase UIDs.
- **WebRTC:** carries live audio/video between browsers.
- **Cloudflare Realtime TURN:** relays WebRTC traffic when direct peer-to-peer connectivity fails.

Users only need a modern browser and camera/microphone permission. HTTPS is required; Vercel provides it automatically.

## 1. Deploy directly to Vercel (no local computer required for runtime)

1. Download this ZIP and extract it.
2. Create a **private** GitHub repository at https://github.com/new.
3. Upload the extracted project files to the repository (the files inside the `sziasors` folder, not an extra parent folder).
4. Open https://vercel.com/new and import that GitHub repository.
5. Keep the detected framework as **Next.js**. Build command: `npm run build`; output directory: leave default.
6. Before deploying, add the environment variables listed below under Vercel → Project → Settings → Environment Variables. Select **Production**, and also **Preview** if you want preview deployments.
7. Click Deploy. Whenever you push a change to the connected GitHub repository, Vercel will build and deploy it automatically.

## 2. Vercel environment variables

Add each variable separately. Do not paste the whole `.env.example` file into one field.

### Firebase browser config (these values are already filled in below)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBiuGNminiFE-qC69FQxmaBsZW-KVZuv4E` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `blackcrown-cf4e0.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | `https://blackcrown-cf4e0-default-rtdb.firebaseio.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `blackcrown-cf4e0` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `blackcrown-cf4e0.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `478537031588` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:478537031588:web:5a2f21f2f7704988852b31` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-QFJY6HXVD0` |

### Firebase Admin (server secrets)

1. Open https://console.firebase.google.com/project/blackcrown-cf4e0/settings/serviceaccounts/adminsdk.
2. Generate a new private key and download the JSON file.
3. In Vercel, add:

| Name | Value |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | `blackcrown-cf4e0` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Copy `client_email` from the downloaded JSON |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Copy the entire `private_key` value, including BEGIN/END lines |

When pasting `FIREBASE_ADMIN_PRIVATE_KEY` into Vercel, paste the complete key as one value. Do not add `NEXT_PUBLIC_` to any Admin variable. Never commit the service-account JSON file to GitHub or send it in chat.

### Session secret

Create a long random value (at least 32 characters). For example, generate one using a password manager. Add it as:

| Name | Value |
|---|---|
| `SESSION_SECRET` | Your own random secret (do not reuse a password) |

### Cloudflare TURN

1. Open https://dash.cloudflare.com/ and select your account.
2. Go to **Realtime → TURN Server** and create/select a TURN key.
3. Copy the **Turn Token ID** and its **API Token**. The API Token may only be shown once; store it safely.
4. In Vercel add:

| Name | Value |
|---|---|
| `CLOUDFLARE_TURN_KEY_ID` | Cloudflare Turn Token ID |
| `CLOUDFLARE_TURN_API_TOKEN` | Cloudflare TURN API Token (mark as Sensitive if Vercel offers that option) |

The API token stays on the Vercel server. `/api/ice` asks Cloudflare for temporary ICE credentials (24-hour TTL) and returns only those temporary credentials to the authenticated browser. Port 53 URLs are filtered out for browser compatibility.

### Teen video flag

Add `TEEN_VIDEO_ENABLED` with value `false`. The current app only enables adult video matching. A separate teen mode must not be activated by a simple age dropdown: it requires real age assurance, a dedicated teen-only service boundary, moderation and safeguarding procedures, and legal/privacy review. Adult and teen users must never be matched together.

## 3. Firebase setup

1. Open https://console.firebase.google.com/project/blackcrown-cf4e0.
2. In **Build → Realtime Database**, create/select the database. Confirm its URL is `https://blackcrown-cf4e0-default-rtdb.firebaseio.com`.
3. In **Build → Authentication → Sign-in method**, enable **Anonymous** sign-in.
4. In **Realtime Database → Rules**, publish the contents of `database.rules.json`. Review the rules before launch.
5. In **Authentication → Settings → Authorized domains**, add the Vercel production hostname, e.g. `sziasors.vercel.app` (use the actual hostname Vercel assigns).

## 4. Deploy / redeploy

After adding or changing environment variables, go to Vercel → Deployments and redeploy the latest deployment. Environment variable changes do not affect an already-built deployment.

## 5. Test

- Open the production URL in two separate browsers/devices.
- Use two different accounts/sessions and grant camera/microphone permission.
- Test random matching and matching within the same county.
- Test from different networks (for example home Wi-Fi and mobile data).
- Check browser console/network logs for `/api/ice` and verify that Cloudflare returns temporary ICE servers.
- Test TURN relay connectivity; a successful page load alone does not prove that TURN works.

## Current implementation and limitations

- Modern responsive Hungarian browser UI.
- Nickname entry backed by Firebase Anonymous Authentication.
- County filter / nationwide random queue.
- Server-side queue pairing using Firebase Admin transactions.
- WebRTC offer/answer and ICE candidate signaling via Realtime Database.
- Text chat, next, leave and basic report submission.
- Current video pool is adult-only. Teen video is intentionally blocked; the UI's age choice is not age verification.
- This starter does not yet include production-grade rate limiting, CAPTCHA, automated moderation, moderator dashboard, robust queue expiry/cleanup, block lists, abuse escalation, privacy/retention workflows or load/security testing.
- A public random video chat can expose users to harmful content. Complete safeguarding, reporting, moderation, legal and privacy work before opening it publicly.
