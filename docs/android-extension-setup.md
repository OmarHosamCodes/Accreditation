# Android extension setup

Chrome for Android does not support browser extensions. To audit Instagram and Facebook on a phone, sideload the Accreditation extension into a Chromium browser that supports extensions.

## Recommended browser

Use **Microsoft Edge Canary** from the Play Store. It includes extension support migrated from Kiwi Browser.

Kiwi Browser is archived and no longer maintained (as of January 2025). Do not rely on it for new setups.

## Pack the extension

From the repo root:

```bash
bun --filter @accreditation/extension pack
```

This creates `packages/extension/dist/accreditation-extension.zip` with everything needed except `node_modules`.

Transfer the zip to your Android device (email, cloud storage, USB, etc.) and unzip it, or sideload the unpacked `packages/extension` folder if your workflow allows.

## Install on Android

Steps vary slightly by browser; the general flow:

1. Install **Microsoft Edge Canary**.
2. Open browser settings and enable **Developer options** (or the equivalent for extension sideloading).
3. Sideload the extension:
   - Load the unpacked extension folder, or
   - Install from the zip if your browser supports it.
4. Note the **extension ID** assigned on the device. It may differ from your desktop unpacked ID.

## Configure production URLs

A physical phone cannot reach `localhost` on your dev machine unless you expose the API on your LAN. For real auditing, point the extension at your deployed Railway origin.

Open the extension popup and set:

```text
API base URL=https://your-service.up.railway.app
Website base URL=https://your-service.up.railway.app
```

Update server env vars to match the Android extension ID:

```bash
EXTENSION_ORIGIN=chrome-extension://YOUR_ANDROID_EXTENSION_ID
VITE_EXTENSION_ID=YOUR_ANDROID_EXTENSION_ID
```

Rebuild/redeploy the web app if `VITE_EXTENSION_ID` changed.

## Connect your account

1. In the extension popup, tap **Sign in on website**.
2. Sign in with your auditor credentials on the connect page.
3. If automatic handoff works, you will see “Extension connected”.
4. If automatic handoff fails (common on Android), the connect page shows a **copyable token**. Copy it, open the extension popup, expand **Paste token manually**, paste the token, and tap **Save token**.

## Verify the toolbar

1. Open a mobile Instagram or Facebook profile in the browser, for example:
   - `https://m.instagram.com/yourbrand`
   - `https://m.facebook.com/yourbrand`
2. The audit toolbar should appear as a bottom sheet.
3. Tap **Start audit**, enable **Pin** mode, touch a page element to attach evidence, score metrics, and publish.

## Known limits

- **Edge Canary** is a dev channel. Expect occasional instability.
- **Extension ID changes** when you reinstall or sideload again. Update `EXTENSION_ORIGIN` and `VITE_EXTENSION_ID` when it changes.
- **Mobile DOM differs** from desktop. Evidence selectors may be less stable on `m.instagram.com` / `m.facebook.com` than on desktop URLs.
- **In-app browsers** (Instagram/Facebook native apps) cannot load extensions. Auditors must use the mobile web site in Edge Canary.
- **Touch pinning** uses pointer events with debouncing. Very fast multi-touch gestures may occasionally be ignored.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Toolbar does not appear | Confirm the URL is `instagram.com` or `facebook.com` (including `m.` subdomains). Reload the page after installing the extension. |
| Cannot sign in | Use production URLs, not `localhost`. Try manual token paste. |
| API errors after connect | Check API base URL in the popup. Confirm `EXTENSION_ORIGIN` on the server matches this install’s extension ID. |
| Pin mode does not attach evidence | Collapse the toolbar first (pin mode hides the sheet on mobile). Tap the page element once; avoid multi-finger gestures. |
