#!/bin/bash
# Clears what earlier local builds left behind, then checks there's room for
# the next one. Sourced by ship.sh and ship-android.sh:
#   free_space <gigabytes the build needs>
# Everything removed here is rebuilt or downloaded again when needed; nothing
# a build in progress is using is touched. The ship scripts stop at the first
# failing command, so a step with nothing to clear must not fail.

free_space() {
  local needed=$1
  local before
  before=$(df -g . | tail -1 | awk '{print $4}')
  echo "▶ Clearing old build files (${before} GB free)…"

  # Builds already uploaded to the stores
  rm -f build-*.ipa build-*.aab

  # Every local iOS build compiles in a fresh folder, so Xcode keeps a new
  # cache for each one
  rm -rf ~/Library/Developer/Xcode/DerivedData/GrandCityRace-*

  # Archives: the three newest stay, for symbolicating crash reports
  if [ -d ~/Library/Developer/Xcode/Archives ]; then
    find ~/Library/Developer/Xcode/Archives -maxdepth 2 -name 'GrandCityRace *.xcarchive' -print0 \
      | while IFS= read -r -d '' archive; do echo "$(stat -f %m "$archive") $archive"; done \
      | sort -rn | tail -n +4 | cut -d' ' -f2- \
      | while IFS= read -r archive; do rm -rf "$archive"; done
    find ~/Library/Developer/Xcode/Archives -mindepth 1 -maxdepth 1 -type d -empty -delete || true
  fi

  # Working folders of builds that failed or were stopped. Only ones older than
  # three hours, so a build running in parallel keeps its own.
  find "${TMPDIR:-/tmp}/eas-build-local-nodejs" -mindepth 1 -maxdepth 1 -mmin +180 -exec rm -rf {} + 2>/dev/null || true

  # Simulators of iOS versions no longer installed, which can't run anyway
  xcrun simctl delete unavailable 2>/dev/null || true

  local after
  after=$(df -g . | tail -1 | awk '{print $4}')
  echo "  ${after} GB free now."
  if [ "$after" -lt "$needed" ]; then
    cat <<MSG
Error: a build needs about ${needed} GB free, and there are ${after} GB.
The usual big ones (check before deleting):
  ~/Library/Developer/CoreSimulator/Devices   simulators: xcrun simctl delete <device>
  ~/Library/Caches                            app caches
  ~/.gradle/caches                            Android build caches, downloaded again
MSG
    exit 1
  fi
}
