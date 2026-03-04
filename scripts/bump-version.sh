#!/usr/bin/env bash
set -euo pipefail

# Bump version across package.json, Android build.gradle, and iOS project.pbxproj
# Usage:
#   ./scripts/bump-version.sh patch    # 1.1.0 -> 1.1.1
#   ./scripts/bump-version.sh minor    # 1.1.0 -> 1.2.0
#   ./scripts/bump-version.sh major    # 1.1.0 -> 2.0.0
#   ./scripts/bump-version.sh 2.0.0    # set explicit version
#   ./scripts/bump-version.sh          # show current versions

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/package.json"
GRADLE="$ROOT/android/app/build.gradle"
PBXPROJ="$ROOT/ios/StatusVault.xcodeproj/project.pbxproj"

# Read current values
current_version=$(grep '"version"' "$PKG" | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
current_build=$(grep 'versionCode' "$GRADLE" | head -1 | sed 's/[^0-9]*//')

# Show current state if no args
if [[ $# -eq 0 ]]; then
  pkg_ver=$(grep '"version"' "$PKG" | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
  gradle_name=$(grep 'versionName' "$GRADLE" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  gradle_code=$(grep 'versionCode' "$GRADLE" | head -1 | sed 's/[^0-9]*//')
  ios_ver=$(grep 'MARKETING_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= *\([^;]*\);.*/\1/')
  ios_build=$(grep 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= *\([^;]*\);.*/\1/')

  echo "Current versions:"
  echo "  package.json:  $pkg_ver"
  echo "  Android:       $gradle_name (build $gradle_code)"
  echo "  iOS:           $ios_ver (build $ios_build)"

  # Check alignment
  if [[ "$pkg_ver" == "$gradle_name" && "$gradle_name" == "$ios_ver" && "$gradle_code" == "$ios_build" ]]; then
    echo ""
    echo "All versions are aligned."
  else
    echo ""
    echo "WARNING: Versions are out of sync!"
  fi
  exit 0
fi

# Parse version bump type or explicit version
IFS='.' read -r major minor patch <<< "$current_version"

case "${1}" in
  patch)
    new_version="$major.$minor.$((patch + 1))"
    ;;
  minor)
    new_version="$major.$((minor + 1)).0"
    ;;
  major)
    new_version="$((major + 1)).0.0"
    ;;
  *)
    # Validate explicit version format
    if [[ ! "${1}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: Invalid version '${1}'. Use 'patch', 'minor', 'major', or a semver like '1.2.3'."
      exit 1
    fi
    new_version="${1}"
    ;;
esac

new_build=$((current_build + 1))

echo "Bumping: $current_version (build $current_build) -> $new_version (build $new_build)"
echo ""

# Update package.json
sed -i '' "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" "$PKG"
echo "  Updated package.json"

# Update Android build.gradle
sed -i '' "s/versionCode $current_build/versionCode $new_build/" "$GRADLE"
sed -i '' "s/versionName \"$current_version\"/versionName \"$new_version\"/" "$GRADLE"
echo "  Updated android/app/build.gradle"

# Update iOS project.pbxproj (all occurrences)
sed -i '' "s/MARKETING_VERSION = $current_version;/MARKETING_VERSION = $new_version;/g" "$PBXPROJ"
sed -i '' "s/CURRENT_PROJECT_VERSION = $current_build;/CURRENT_PROJECT_VERSION = $new_build;/g" "$PBXPROJ"
echo "  Updated ios/StatusVault.xcodeproj/project.pbxproj"

echo ""
echo "Done! All platforms set to v$new_version (build $new_build)"
