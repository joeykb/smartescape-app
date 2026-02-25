#!/bin/bash
# EAS Build hook: copy GoogleService-Info.plist from EAS secret into project root
# The file secret is mounted at the path stored in $GOOGLE_SERVICE_INFO_PLIST

if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ] && [ -f "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "✅ Copying GoogleService-Info.plist from EAS secret..."
  cp "$GOOGLE_SERVICE_INFO_PLIST" ./GoogleService-Info.plist
else
  echo "⚠️  GOOGLE_SERVICE_INFO_PLIST secret not found — build may fail for iOS"
fi
