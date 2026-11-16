#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
LOCCAL_APP_URL=https://loccal-web.vercel.app npm run ios:sync
release_dir="$(mktemp -d /private/tmp/loccal-release.XXXXXX)"
mkdir -p "$release_dir/source/ios" ios/build/export
# Build outside synced Documents so file-provider metadata cannot break signing.
rsync -a --exclude DerivedData/ --exclude build/ ios/ "$release_dir/source/ios/"
printf '%s\n' "$release_dir" > ios/build/archive-location.txt
xcodebuild -project "$release_dir/source/ios/App/App.xcodeproj" -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$release_dir/Loccal.xcarchive" -derivedDataPath "$release_dir/DerivedData" \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY='Apple Distribution' \
  DEVELOPMENT_TEAM=VRTT45LLND PROVISIONING_PROFILE_SPECIFIER='Loccal App Store' archive
xcodebuild -exportArchive -archivePath "$release_dir/Loccal.xcarchive" \
  -exportOptionsPlist ios/ExportOptions.plist -exportPath "$release_dir/export"
codesign --verify --deep --strict "$release_dir/Loccal.xcarchive/Products/Applications/App.app"
cp "$release_dir/export/App.ipa" ios/build/export/Loccal.ipa
printf 'Signed IPA: ios/build/export/Loccal.ipa\nArchive: %s\n' "$release_dir/Loccal.xcarchive"
