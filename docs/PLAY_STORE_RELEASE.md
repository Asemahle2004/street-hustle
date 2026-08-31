# Street Hustle — Google Play Release Guide

## Verified Android build milestone

**Street Hustle 0.11.0 (versionCode 11) successfully built end-to-end in GitHub Actions on 31 August 2026.**

Verified cloud-build outputs:

- installable debug APK;
- release Android App Bundle (`.aab`);
- Google Play 512×512 icon;
- Google Play 1024×500 feature graphic;
- offline release audit passed;
- Android Gradle compile passed;
- target/compile SDK 36 passed;
- PlayCanvas bundled locally;
- Soldier/Xbot/Michelle prototype GLBs bundled locally;
- forbidden remote PlayCanvas/prototype-model runtime URLs absent from packaged APK text assets.

Successful workflow run: `33445687644` at commit `0a46745fa4fc6916423e8de255c8afe40fec9749`.

The GitHub-generated release AAB is unsigned when repository signing secrets are absent. A private upload-key package can be created outside the public repository and the AAB signed with that upload identity. **Never commit an upload keystore or its passwords to this repository.**

## Android identity

- App name: **Street Hustle**
- Package/application ID: **`com.asemahle2004.streethustle`**
- Current Android build line: **0.11.x**
- Minimum SDK configured by the release script: **API 24**
- Target/compile SDK: **API 36 (Android 16)**
- Orientation: **landscape**
- Android wrapper: **Capacitor 8**

> The package ID can be changed before the first Play Console app is created/uploaded. Treat it as permanent after publication.

## What GitHub builds

The workflow `.github/workflows/android-playstore.yml` builds Street Hustle entirely in GitHub Actions, so Android Studio is not required locally just to produce test/release files.

It generates:

1. `app-debug.apk` — installable device-test build.
2. `app-release.aab` — Android App Bundle for Google Play.
3. `icon-512.png` — Play Store app icon.
4. `feature-graphic-1024x500.png` — Play Store feature graphic.
5. `release-build-info.txt` — version, package, target SDK and signing state.

The mobile preparation step packages PlayCanvas and the current Soldier/Xbot/Michelle prototype GLBs inside the Android application so those runtime files do not depend on their development CDNs.

## Build from GitHub

Open **Actions → Android Play Store Build → Run workflow**.

For the 0.11 line use:

- Version name: `0.11.0`
- Version code: `11`

Every Google Play update must use a higher version code.

## Release signing

Google Play upload bundles must be signed. The workflow supports these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Do **not** commit a `.jks`/keystore or its passwords to this public repository.

Use Google Play App Signing when creating the Play app. Keep at least two secure backups of the upload key and its credentials.

## Play Console listing files prepared

See `store-listing/`:

- `short-description.txt`
- `full-description.txt`
- `release-notes.txt`
- `data-safety.md`
- `content-rating-notes.md`
- `app-access.md`
- `screenshot-plan.md`

Public privacy policy:

`https://asemahle2004.github.io/street-hustle/privacy.html`

The policy and third-party notices are also reachable through the in-game **LEGAL** button.

## Play Console setup checklist

1. Create/verify the Google Play developer account.
2. Create a new app named **Street Hustle**.
3. Confirm package ID `com.asemahle2004.streethustle` before first upload.
4. Enable Play App Signing.
5. Upload the **signed** AAB to Internal testing first.
6. Add the short/full description.
7. Upload the 512×512 icon and 1024×500 feature graphic.
8. Capture/upload screenshots from the actual Android build.
9. Add the public privacy policy URL.
10. Complete Data safety using `store-listing/data-safety.md`, re-checking it against the exact release build.
11. Ads declaration: **No ads** for the current build.
12. App access: no login/restricted access; use `store-listing/app-access.md`.
13. Complete the official IARC content-rating questionnaire using `store-listing/content-rating-notes.md` as factual notes.
14. Set target audience consistently with the official resulting rating and mature themes.
15. Complete the remaining Play Console app-content declarations.
16. Run Internal testing and then Closed testing where the account requires it.

## 2026 Google Play target API requirement

From 31 August 2026, ordinary new apps and updates submitted to Google Play must target Android 16 / API 36 or higher, subject to Google's listed exceptions. This pipeline explicitly sets target/compile SDK 36.

## New personal developer account testing requirement

For personal developer accounts created after 13 November 2023, Google currently requires a closed test with at least **12 testers opted in continuously for 14 days** before applying for production access. Follow the exact current Play Console instructions for the account.

## Remaining Production gates

A technically valid APK/AAB is not automatically a public-production-ready game.

### 1. Character/asset licensing

The current humanoid prototypes use Soldier, Xbot and Michelle GLBs from the three.js examples repository. Before a commercial Production release, confirm the exact redistribution terms or replace them with clearly licensed/original Street Hustle character assets.

A preferred replacement route is a clearly licensed character set such as Quaternius Universal Base Characters and Universal Animation Library, which are published for commercial use under CC0. Integrate and retest replacements before Production.

### 2. Real-device testing

Test on multiple Android phones, especially lower/mid-range hardware. Verify:

- installation and first launch;
- frame rate and memory use;
- touch controls;
- UI safe areas/notches;
- save/load after full app restart;
- landscape lock/fullscreen behavior;
- no stretched vehicle parts or stacked NPCs;
- offline launch;
- long sessions do not leak memory;
- police/traffic/collision systems do not soft-lock story progression.

### 3. Store screenshots

Use screenshots from the actual Android build. Do not present concept art as gameplay.

### 4. Policy declarations

Re-check Data safety, privacy, content rating and target audience immediately before submission. Future analytics, ads, cloud saves, accounts, AI network calls, location or multiplayer features change the declarations.

## Recommended release sequence

`Debug APK → real-phone QA → Internal testing signed AAB → bug fixes → Closed testing → asset-license clearance → production-readiness review → Production`
