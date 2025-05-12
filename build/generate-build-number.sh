#!/bin/bash
# Alternative method: Use Git commit count as a build number
# This script can be used as an alternative to the counter file approach

# Count all commits in the current branch
COMMIT_COUNT=$(git rev-list --count HEAD)

# You can add an offset if you want to start from a higher number
OFFSET=10000
BUILD_NUMBER=$((COMMIT_COUNT + OFFSET))

echo "Build number from git commits: $BUILD_NUMBER"
echo "$BUILD_NUMBER"