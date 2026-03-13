# Merge Conflict Resolution Guide

## Current Situation Analysis

You have **8 open pull requests** with overlapping changes, causing merge conflicts. Here's what's happening:

### Conflicting PRs Summary

| PR # | Title | Status | Key Files Modified |
|------|-------|--------|-------------------|
| 30 | Stories feature | dirty | `server.ts`, `src/App.tsx`, story components |
| 29 | Telegram notifications | dirty | `server.ts`, `src/App.tsx`, onboarding, User model |
| 28 | Real-time updates | dirty | `src/App.tsx`, NotificationBell, NotificationPanel |
| 27 | Security hardening | dirty | `server.ts` |
| 26 | Social features | dirty | `server.ts`, `bot/index.ts` |
| 25 | Instagram-like features | open | Multiple files |
| 22 | Update features | WIP | Multiple files |
| 33 | Fix merge conflicts | clean | (current branch) |

### Most Conflicted Files

1. **`server.ts`** - Modified in PRs: 30, 29, 27, 26
2. **`src/App.tsx`** - Modified in PRs: 30, 29, 28
3. **User model & bot files** - Modified in PRs: 29, 26

---

## Recommended Resolution Strategy

### Option 1: Sequential Merge Strategy (Recommended)

Merge PRs one at a time in a logical order, resolving conflicts as you go:

#### Merge Order:
1. **PR #27** (Security) - Foundation layer, should go first
2. **PR #26** (Social features) - Core functionality
3. **PR #28** (Real-time updates) - Infrastructure
4. **PR #29** (Telegram notifications) - User features
5. **PR #30** (Stories) - New features
6. **PR #25** (Instagram features) - Enhancements

#### Steps for Each PR:

```bash
# 1. Update the PR branch with latest main
git checkout copilot/implement-clickable-profiles  # PR #27
git fetch origin
git merge origin/main

# 2. Resolve any conflicts
# - Use your IDE's merge tool
# - Test after resolving
# - Run: npm run test && npm run build

# 3. Push and merge to main
git push origin copilot/implement-clickable-profiles

# 4. Wait for PR to be merged, then repeat for next PR
```

---

### Option 2: Create Integration Branch

Create a single integration branch that combines all changes:

```bash
# 1. Create integration branch from main
git checkout main
git pull origin main
git checkout -b integration/all-features

# 2. Merge each feature branch in order
git merge origin/copilot/implement-clickable-profiles  # PR #27
git merge origin/copilot/fix-signup-signin-errors       # PR #26
git merge origin/copilot/fix-telegram-bot-response      # PR #28
git merge origin/copilot/fix-post-page-ui               # PR #29
git merge origin/copilot/fix-feed-ui-design             # PR #30

# 3. Resolve conflicts incrementally after each merge
# 4. Test thoroughly
npm install
npm run test -- --run
npm run build

# 5. Create single PR to main
git push origin integration/all-features
```

---

### Option 3: Rebase Strategy (Advanced)

Rebase each branch onto the previous one:

```bash
# Start with base branch (PR #27)
git checkout copilot/implement-clickable-profiles
git rebase main

# Rebase next branch onto previous
git checkout copilot/fix-signup-signin-errors  # PR #26
git rebase copilot/implement-clickable-profiles

# Continue for each branch...
```

⚠️ **Warning**: This rewrites history. Only use if you're comfortable with rebasing.

---

## Preventing Future Merge Conflicts

### 1. Reduce PR Size and Scope
- Keep PRs focused on single features
- Avoid touching too many files in one PR
- Break large features into smaller, incremental PRs

### 2. Improve Coordination
- **Check open PRs** before starting new work
- Avoid modifying `server.ts` and `src/App.tsx` simultaneously across multiple PRs
- Use feature flags for work-in-progress features

### 3. Establish Merge Order Priority

Create `.github/PR_PRIORITY.md`:
```markdown
# PR Merge Priority

1. Security & Infrastructure (highest priority)
2. Bug Fixes
3. Core Features
4. Enhancements
5. UI/UX Improvements (lowest priority)

Merge foundation changes before building on top of them.
```

### 4. Use Better Branch Strategy

```bash
# Feature branches
feature/story-viewer
feature/telegram-notifications
feature/real-time-chat

# Layer branches
infra/security-hardening
infra/socket-improvements

# Bugfix branches
fix/notification-bell
fix/chat-sync
```

### 5. Set Up Git Configuration

Add to `.gitattributes`:
```
*.ts merge=union
*.tsx merge=union
package.json merge=union
```

### 6. Implement Pre-merge Checks

Create `.github/workflows/check-conflicts.yml`:
```yaml
name: Check for Conflicts

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-conflicts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Check for merge conflicts with main
        run: |
          git fetch origin main
          git merge-tree $(git merge-base HEAD origin/main) origin/main HEAD
```

### 7. Communication Guidelines

- **Label PRs**: `priority-high`, `priority-low`, `blocks-other-prs`
- **Update PR descriptions** when conflicts arise
- **Coordinate in comments** before merging large changes
- **Notify team** when merging infrastructure changes

---

## Immediate Action Plan

1. **Close or consolidate stale PRs**: PRs #22 and #33 (WIP branches)
2. **Prioritize PR #27** (Security) - merge first
3. **Update remaining PRs** one by one after each merge
4. **Consider consolidating** PRs #28, #29 (both involve notifications/telegram)
5. **Test thoroughly** after each merge

---

## Tools to Help

### VS Code Extensions
- **GitLens** - See blame and history
- **Merge Conflict** - Better conflict resolution UI
- **Git Graph** - Visualize branch relationships

### Git Commands

```bash
# Check which files conflict with main
git diff --name-only origin/main...HEAD

# See what changed in a file between branches
git diff origin/main:server.ts HEAD:server.ts

# Find common ancestor
git merge-base origin/main HEAD

# Abort a bad merge
git merge --abort

# Use theirs/ours for specific files
git checkout --theirs server.ts
git checkout --ours src/App.tsx
```

### Automated Conflict Detection

```bash
# Check if branch can merge cleanly
git fetch origin main
git merge-tree $(git merge-base HEAD origin/main) origin/main HEAD | grep -A 10 "changed in both"
```

---

## Summary

**The root cause**: Too many PRs modifying the same core files (`server.ts`, `src/App.tsx`) simultaneously.

**Best solution**:
1. Merge PRs sequentially, starting with infrastructure (PR #27)
2. Update each subsequent PR after previous one merges
3. Implement better branching and coordination practices going forward

**Time estimate**:
- Sequential merging: 2-4 hours
- Integration branch: 1-2 hours
- Testing: 1-2 hours per approach

---

## Need Help?

If you encounter conflicts you can't resolve:
1. Post the conflicting file sections
2. Describe what each change is trying to do
3. I can help you manually merge the changes correctly
