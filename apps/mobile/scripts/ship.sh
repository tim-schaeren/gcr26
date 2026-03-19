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

echo "▶ Submitting $IPA to TestFlight..."
eas submit --platform ios --path "$IPA" --apple-id "$APPLE_ID" --asc-app-id "$ASC_APP_ID"

echo "✓ Done. Check App Store Connect → TestFlight in ~10 minutes."
