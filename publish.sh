#!/bin/bash
set -e

# Auto bump minor version and publish to npm
# Usage:
#   ./publish.sh          → bump minor (1.5.0 → 1.6.0)
#   ./publish.sh patch    → bump patch (1.5.0 → 1.5.1)
#   ./publish.sh major    → bump major (1.5.0 → 2.0.0)

BUMP_TYPE="${1:-minor}"

echo "=== Apero Kit CLI — Publish ==="
echo ""

# 1. Get current version
CURRENT=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT"

# 2. Bump version (no git tag)
NEW=$(npm version "$BUMP_TYPE" --no-git-tag-version)
echo "New version:     $NEW"
echo ""

# 3. Publish to npm
echo "Publishing to npm..."
npm publish --access public
echo ""

# 4. Git commit + tag
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW"
git tag "$NEW"
git push && git push --tags

echo ""
echo "Done! Published $NEW to npm"
