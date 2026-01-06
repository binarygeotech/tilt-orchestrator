#!/usr/bin/env bash
set -euo pipefail

#######################################
# Configuration
#######################################
ALLOWED_BRANCHES=("main")
SEMVER_REGEX='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'

#######################################
# Input validation
#######################################
VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.2.3"
  exit 1
fi

if [[ ! "$VERSION" =~ $SEMVER_REGEX ]]; then
  echo "❌ Invalid version: $VERSION"
  echo "Expected semantic version (e.g. 1.2.3, 1.2.3-beta.1)"
  exit 1
fi

#######################################
# Environment checks
#######################################
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ ! " ${ALLOWED_BRANCHES[*]} " =~ " ${BRANCH} " ]]; then
  echo "❌ Releases must be made from ${ALLOWED_BRANCHES[*]} (current: $BRANCH)"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is not clean"
  exit 1
fi

if git tag --list | grep -qx "v$VERSION"; then
  echo "❌ Tag v$VERSION already exists"
  exit 1
fi

#######################################
# Dependency checks
#######################################
command -v jq >/dev/null || { echo "❌ jq is required"; exit 1; }
command -v cargo >/dev/null || { echo "❌ cargo is required"; exit 1; }
command -v npm >/dev/null || { echo "❌ npm is required"; exit 1; }

#######################################
# Version updates (SAFE)
#######################################
echo "🚀 Preparing release v$VERSION"

# package.json (npm handles JSON safely)
npm version "$VERSION" --no-git-tag-version

# Cargo.toml (TOML-aware, injection-safe)
cargo set-version "$VERSION" --manifest-path src-tauri/Cargo.toml

# Ensure Cargo.lock is consistent
(
  cd src-tauri
  cargo check
)

# tauri.conf.json (JSON-aware, injection-safe)
tmpfile="$(mktemp)"
jq --arg v "$VERSION" '.version = $v' src-tauri/tauri.conf.json > "$tmpfile"
mv "$tmpfile" src-tauri/tauri.conf.json

#######################################
# Commit + tag
#######################################
git add \
  package.json \
  package-lock.json \
  src-tauri/Cargo.toml \
  src-tauri/Cargo.lock \
  src-tauri/tauri.conf.json

git commit -m "chore(release): v$VERSION"

git tag -a "v$VERSION" -m "Release v$VERSION"

#######################################
# Done
#######################################
echo "✅ Release v$VERSION prepared successfully"
echo
echo "Next steps:"
echo "  git push origin $BRANCH"
echo "  git push origin v$VERSION"
