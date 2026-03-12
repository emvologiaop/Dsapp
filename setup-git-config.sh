#!/bin/bash
# Git Configuration Helper for Dsapp Repository
# This script sets up useful Git aliases and configurations to help prevent merge conflicts

echo "🔧 Setting up Git configuration for Dsapp..."

# Set up useful Git aliases
echo "📝 Adding Git aliases..."

git config alias.sync '!git fetch origin && git merge origin/main'
git config alias.check-conflicts '!git fetch origin && git merge-tree $(git merge-base HEAD origin/main) origin/main HEAD | grep -A 10 "changed in both"'
git config alias.conflict-files '!git diff --name-only origin/main...HEAD'
git config alias.lg 'log --graph --oneline --all --decorate'
git config alias.branches 'branch -a --sort=-committerdate'
git config alias.prune-merged '!git branch --merged | grep -v "\\*\\|main\\|master" | xargs -n 1 git branch -d'

echo "✅ Git aliases configured:"
echo "  - git sync                 # Update branch with main"
echo "  - git check-conflicts      # Check for conflicts without merging"
echo "  - git conflict-files       # List files that conflict with main"
echo "  - git lg                   # Pretty log graph"
echo "  - git branches             # List branches by date"
echo "  - git prune-merged         # Delete merged branches"

# Configure Git settings for better merge handling
echo ""
echo "⚙️  Configuring Git settings..."

git config pull.rebase false
git config merge.conflictstyle diff3
git config rerere.enabled true

echo "✅ Git settings configured:"
echo "  - Pull strategy: merge (not rebase)"
echo "  - Conflict style: diff3 (shows common ancestor)"
echo "  - Rerere enabled (remembers conflict resolutions)"

# Set up branch protection reminders
echo ""
echo "📋 Branch best practices:"
echo "  1. Always work in feature branches"
echo "  2. Keep branches synced with main: git sync"
echo "  3. Check for conflicts before PR: git check-conflicts"
echo "  4. Break large changes into smaller PRs"
echo "  5. Review DEVELOPMENT_WORKFLOW.md for guidelines"

echo ""
echo "✨ Git configuration complete!"
echo ""
echo "🚀 Quick Start:"
echo "  1. Check for conflicts: git check-conflicts"
echo "  2. Update your branch: git sync"
echo "  3. View conflict files: git conflict-files"
echo "  4. See branch history: git lg"
