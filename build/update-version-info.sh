#!/bin/bash
# Script to update version information in BuildInfo.cs
# This script replaces placeholder values with actual build information

# Default values
BUILD_NUMBER="${1:-dev}"
GIT_COMMIT="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
BUILD_DATE="$(date -u '+%Y-%m-%dT%H:%M:%S')"
BUILD_INFO_PATH="${3:-../Yuzu.Web/BuildInfo.cs}"

echo "Updating version information..."
echo "  Build Number: $BUILD_NUMBER"
echo "  Build Date: $BUILD_DATE"
echo "  Git Commit: $GIT_COMMIT"

# Check if the BuildInfo.cs file exists
if [ ! -f "$BUILD_INFO_PATH" ]; then
    echo "Error: BuildInfo.cs file not found at $BUILD_INFO_PATH"
    exit 1
fi

# Create a temporary file
TMP_FILE=$(mktemp)

# Replace placeholders with actual values
cat "$BUILD_INFO_PATH" | \
    sed "s/#{BUILD_BUILDNUMBER}#/$BUILD_NUMBER/g" | \
    sed "s/#{BUILD_DATE}#/$BUILD_DATE/g" | \
    sed "s/#{GIT_COMMIT}#/$GIT_COMMIT/g" > "$TMP_FILE"

# Move the temporary file to the original file
mv "$TMP_FILE" "$BUILD_INFO_PATH"

echo "Version information updated successfully."