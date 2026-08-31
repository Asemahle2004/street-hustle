# Street Hustle — Google Play Data Safety Draft

This draft matches the current Android build. Re-check it before every Play Store release if SDKs or online features change.

## Current answers

- **Does the app collect or share any required user data types?** No.
- **Does the app share user data with third parties?** No intentional user-data sharing in the current Android build.
- **Is all data encrypted in transit?** Not applicable to player data because the current Android build does not transmit player save data to a server.
- **Can users request deletion?** The app has no remote account. Players can delete locally stored game data by resetting the game, clearing app storage or uninstalling the app.

## What is stored locally

Street Hustle stores gameplay information in local application/WebView storage, including story progress, cash, reputation, inventory, missions, relationships, settings and player position. This information is not sent to a Street Hustle server in the current build.

## SDK / permission audit for this build

The current release is designed with:

- no advertising SDK;
- no analytics SDK;
- no account/login system;
- no precise or approximate location request;
- no contacts request;
- no camera request;
- no microphone request;
- no photos/media request;
- no SMS/call-log request;
- no payment or billing SDK;
- no push-notification SDK.

The Android wrapper can contain the normal INTERNET capability used by web-native runtimes, but the Play Store package build bundles PlayCanvas and the current 3D character assets locally. The existence of network capability must not be confused with collection of user data.

## Mandatory review trigger

Update this document, `privacy.html`, and Play Console Data safety answers BEFORE release if any of these are added later:

- cloud saves;
- multiplayer;
- user accounts;
- analytics/crash-reporting SDKs that send device data;
- advertising;
- in-app purchases;
- location-aware content;
- social login;
- uploaded photos/audio;
- AI services that send player input to a server.
