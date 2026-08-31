# Krypton Android app (TWA)

A Trusted Web Activity wrapping https://kryptoninvestments.online. It is
not a separate codebase — it renders the live site full-screen, with no
browser UI, so shipping a web change ships an app change. The APK only
needs rebuilding when the icon, name, or version changes.

## The signing key is irreplaceable

`krypton-release.keystore` is gitignored and exists **only** on the
machine that built the app.

- Lose it and you can never publish an update. Android identifies an app
  by its signing key; a differently-signed build is a different app and
  cannot replace the installed one.
- Anyone who holds it can publish an update that users' phones will
  install and trust.

Back it up somewhere durable and private (password manager, encrypted
storage), together with its password. Do not put it in this repo, in
cPanel, or in chat.

Fingerprint of the current key (SHA-256):

```
48:66:83:DF:58:5C:DD:65:92:4E:1E:7F:4F:A1:C6:C9:C2:68:D4:1C:5A:66:95:31:8C:96:FF:10:2B:06:DF:E2
```

## Digital Asset Links

`apps/web/public/.well-known/assetlinks.json` publishes that fingerprint
against package `online.kryptoninvestments.app`. It is what tells Android
this APK is allowed to render the domain without a URL bar.

The two must agree. If the app ever opens showing a browser address bar,
the fingerprint in that file no longer matches the key the APK was signed
with — check that first.

Verify what the domain is serving:

```bash
curl -s https://kryptoninvestments.online/.well-known/assetlinks.json
```

## Rebuilding

Requires the toolchain Bubblewrap installs into `~/.bubblewrap`
(JDK 17 + Android SDK). Bump `appVersionCode` in `twa-manifest.json`
first — Android refuses to install an update whose versionCode is not
higher than the installed one.

```bash
cd android/twa
JAVA_HOME=~/.bubblewrap/jdk/jdk-17.0.11+9 \
ANDROID_HOME=~/.bubblewrap/android_sdk \
  ./gradlew assembleRelease --no-daemon
```

Then align and sign (Gradle emits an unsigned APK here):

```bash
BT=~/.bubblewrap/android_sdk/build-tools/35.0.0
"$BT/zipalign" -p -f 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  krypton-aligned.apk
"$BT/apksigner" sign \
  --ks ../krypton-release.keystore --ks-key-alias krypton \
  --out ../Krypton.apk krypton-aligned.apk
"$BT/apksigner" verify --print-certs ../Krypton.apk
```

## Distribution

Sideloading is what the APK enables, and it is the weaker option: users
must allow "install from unknown sources", Android shows a warning, and
the habit of installing finance apps from chat messages is exactly how
someone ends up installing a fake one. Google Play is the safer channel —
it needs a developer account and review, but users get automatic updates
and a verified publisher.

The PWA install (Chrome's "Install app") needs none of this and gives the
same full-screen result. Prefer it where it works; the APK is for cases
where it doesn't.
