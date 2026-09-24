#!/bin/bash
set -e

# Load Firebase env vars from .env so they get baked into the build
if [ -f .env ]; then
  set -a && source .env && set +a
else
  echo "Error: apps/mobile/.env not found. Copy .env.example and fill in your Firebase values."
  exit 1
fi

echo "▶ Building..."
eas build --platform ios --profile preview --local

# Find the IPA that was just produced
IPA=$(ls -t build-*.ipa 2>/dev/null | head -1)
if [ -z "$IPA" ]; then
  echo "Error: no .ipa file found after build."
  exit 1
fi

# Upload straight to App Store Connect with Xcode's altool, rather than through
# EAS Submit, whose free-tier queue can take hours. Either credential works:
#   - an App Store Connect API key (no 2FA, doesn't expire), or
#   - an app-specific password for your Apple ID.
echo "▶ Uploading $IPA to App Store Connect..."
if [ -n "$ASC_KEY_ID" ] && [ -n "$ASC_ISSUER_ID" ]; then
  xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
elif [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
  if [ -z "$APPLE_ID" ]; then
    echo "Error: APPLE_ID must be set in .env alongside APPLE_APP_SPECIFIC_PASSWORD."
    exit 1
  fi
  xcrun altool --upload-app -f "$IPA" -t ios -u "$APPLE_ID" -p "$APPLE_APP_SPECIFIC_PASSWORD"
else
  cat <<'MSG'
Error: no App Store Connect credentials in .env. Use one of:

  App Store Connect API key (recommended):
    1. App Store Connect → Users and Access → Integrations → Keys → generate a key
       with the "App Manager" role, and download the .p8 (only offered once).
    2. Save it as ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
    3. Put ASC_KEY_ID and ASC_ISSUER_ID in apps/mobile/.env

  App-specific password:
    1. appleid.apple.com → Sign-In and Security → App-Specific Passwords
    2. Put APPLE_APP_SPECIFIC_PASSWORD (and APPLE_ID) in apps/mobile/.env
MSG
  exit 1
fi

echo "✓ Done. Apple processes the build in ~10 minutes, then it appears in App Store Connect → TestFlight."
