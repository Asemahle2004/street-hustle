# Street Hustle — Google Play Release Guide

## Android identity

- App name: **Street Hustle**
- Package/application ID: **`com.asemahle2004.streethustle`**
- Current Android build line: **0.11.x**
- Minimum SDK configured by the release script: **API 24**
- Target/compile SDK: **API 36 (Android 16)**
- Orientation: **landscape**
- Android wrapper: **Capacitor 8**

> The package ID can be changed before the first Play Console app is created/uploaded. Treat it as permanent after publication.

## What GitHub now builds

The workflow `.github/workflows/android-playstore.yml` builds Street Hustle entirely in GitHub Actions, so a developer does not need Android Studio installed locally just to produce test/release files.

It generates:

1. `app-debug.apk` — installable test build.
2. `app-release.aab` — Android App Bundle for Google Play. Without release-signing secrets it is an **unsigned release bundle**; with the four signing secrets it becomes a signed upload bundle.
3. `icon-512.png` — Play Store app icon.
4. `feature-graphic-1024x500.png` — Play Store feature graphic.
5. `release-build-info.txt` — version, package, target SDK and signing state.

The mobile preparation step packages PlayCanvas and the current Soldier/Xbot/Michelle prototype GLB files inside the application so the Android build is not dependent on the CDN for those files at runtime.

## Build from GitHub

Open **Actions → Android Play Store Build → Run workflow**.

For the first 0.11 build use:

- Version name: `0.11.0`
- Version code: `11`

Every Play Store update must use a higher version code.

When the workflow succeeds, download the APK/AAB/graphics from the run's **Artifacts** section.

## Release signing

Google Play upload bundles must be signed. The workflow supports these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Do **not** commit a `.jks`/keystore or its passwords to this public repository.

Until these secrets exist, the workflow deliberately labels the release bundle `UNSIGNED_RELEASE_AAB`. The debug APK remains installable for testing.

Use Google Play App Signing when creating the Play app. Keep a secure backup of the upload key and its passwords. Losing an upload key creates unnecessary recovery work.

## Play Console listing files already prepared

See `store-listing/`:

- `short-description.txt`
- `full-description.txt`
- `release-notes.txt`
- `data-safety.md`
- `content-rating-notes.md`
- `app-access.md`

Public privacy policy URL once GitHub Pages deploys:

`https://asemahle2004.github.io/street-hustle/privacy.html`

The privacy policy is also reachable from the in-game **LEGAL** button.

## Play Console setup checklist

1. Create/verify the Google Play developer account.
2. Create a new app named **Street Hustle**.
3. Confirm package ID `com.asemahle2004.streethustle` before the first upload.
4. Enable Play App Signing.
5. Upload a **signed** AAB.
6. Add the short/full description.
7. Upload the 512×512 icon and 1024×500 feature graphic from the build artifact.
8. Capture/upload phone screenshots from the actual Android build.
9. Add the public privacy policy URL.
10. Complete Data safety using `store-listing/data-safety.md`, re-checking it against the exact release build.
11. Ads declaration: **No ads** for the current build.
12. App access: no login/restricted access; use `store-listing/app-access.md`.
13. Complete the official IARC content-rating questionnaire using `store-listing/content-rating-notes.md` as factual notes.
14. Set target audience consistently with the resulting rating and mature themes.
15. Complete the remaining Play Console app-content declarations.
16. Start with **Internal testing**, then Closed testing where required.

## 2026 Google Play target API requirement

From 31 August 2026, new apps and app updates submitted to Google Play must target Android 16 / API 36 or higher (subject to Google's listed platform exceptions). This pipeline explicitly sets target/compile SDK 36.

## New personal developer account testing requirement

For personal developer accounts created after 13 November 2023, Google currently requires a closed test with at least **12 testers opted in continuously for 14 days** before applying for production access. Follow the exact current Play Console instructions for the account; Google may require meaningful additional testing if production access is not approved.

## Production release blockers — do not ignore

A technically buildable AAB is not automatically ready for public commercial release. Before Production:

### 1. Character/asset licensing

The current real-person prototypes use Soldier, Xbot and Michelle GLBs sourced from the three.js examples repository. Confirm the commercial redistribution terms for each exact asset or replace them with original/explicitly licensed Street Hustle characters. See `licenses.html`.

### 2. Real-device testing

Test the APK/AAB on multiple Android phones, especially lower/mid-range devices. Verify:

- frame rate and memory use;
- touch controls;
- text/UI safe areas;
- save/load after app restart;
- phone rotation remains landscape;
- no stretched vehicle parts or stacked NPCs;
- no blank screen when offline;
- long sessions do not leak memory;
- police/traffic/collision systems do not soft-lock the story.

### 3. Store screenshots

Use actual game screenshots. Do not present concept art as if it were gameplay.

### 4. Policy declarations

Re-check Data safety, privacy, content rating and target audience immediately before submission. Any future analytics, ads, cloud saves, accounts, AI network calls, location or multiplayer features change these answers.

## Recommended release sequence

`Debug APK → phone testing → Internal testing AAB → bug fixes → Closed testing → production-readiness review → Production`

Street Hustle can be packaged now, but public Production should only happen after the asset-license and real-device testing gates above are closed.
