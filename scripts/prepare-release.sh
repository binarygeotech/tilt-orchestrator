#!/bin/bash
set -e

VERSION=$1
BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/prepare-release.sh <version>"
  echo "Example: ./scripts/prepare-release.sh 0.2.0"
  exit 1
fi

# Enforce main/master
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ Releases must be done from main/master (current: $BRANCH)"
  exit 1
fi

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is not clean. Commit or stash changes first."
  exit 1
fi

echo "🚀 Preparing release v$VERSION on branch $BRANCH"

# Update package.json
npm version "$VERSION" --no-git-tag-version

# Update Cargo.toml
sed -i '' 's/^version = ".*"/version = "'"$VERSION"'"/' src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i '' 's/"version": ".*"/"version": "'"$VERSION"'"/' src-tauri/tauri.conf.json

# Update Cargo.lock
(
  cd src-tauri
  cargo update -p tilt-orchestrator
)

# Commit version bump
git add \
  package.json \
  package-lock.json \
  src-tauri/Cargo.toml \
  src-tauri/Cargo.lock \
  src-tauri/tauri.conf.json

git commit -m "chore(release): v$VERSION"

# Create annotated tag on the same commit
git tag -a "v$VERSION" -m "Release v$VERSION"

echo "✅ Release v$VERSION prepared"
echo ""
echo "Next steps:"
echo "  git push origin $BRANCH"
echo "  git push origin v$VERSION"
