# Development Workflow Guidelines

## Branch Naming Convention

```
feature/    - New features (e.g., feature/story-viewer)
fix/        - Bug fixes (e.g., fix/notification-sync)
infra/      - Infrastructure changes (e.g., infra/security)
refactor/   - Code refactoring (e.g., refactor/user-model)
docs/       - Documentation only (e.g., docs/api-guide)
test/       - Test additions/fixes (e.g., test/story-helpers)
```

## PR Size Guidelines

### Small PR (Preferred)
- ✅ 1-3 files changed
- ✅ < 200 lines added/deleted
- ✅ Single, focused change
- ✅ Can be reviewed in 15 minutes

### Medium PR
- ⚠️ 4-10 files changed
- ⚠️ 200-500 lines added/deleted
- ⚠️ Related changes, single feature
- ⚠️ Requires 30-45 minute review

### Large PR (Avoid)
- ❌ 10+ files changed
- ❌ 500+ lines added/deleted
- ❌ Multiple features/concerns
- ❌ Difficult to review and test

**Action**: Break large PRs into smaller, incremental ones.

---

## Conflict-Prone Files

These files are frequently modified and cause conflicts:

### High-Risk Files
- `server.ts` - Backend API routes
- `src/App.tsx` - Main app component
- `src/models/User.ts` - User data model
- `package.json` - Dependencies

### Mitigation Strategy

1. **Avoid simultaneous edits** to these files across multiple PRs
2. **Modularize**: Extract routes from `server.ts` into separate files:
   ```
   server/
     ├── routes/
     │   ├── auth.ts
     │   ├── posts.ts
     │   ├── stories.ts
     │   └── users.ts
     ├── middleware/
     └── index.ts
   ```
3. **Break up App.tsx**: Extract sections into components
4. **Coordinate**: Check open PRs before modifying these files

---

## Pre-Merge Checklist

Before requesting a review:

- [ ] Branch is up to date with `main`
- [ ] All tests pass: `npm run test -- --run`
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint` (or known failures documented)
- [ ] No merge conflicts with `main`
- [ ] PR description explains the change
- [ ] Breaking changes are documented

---

## Merge Order Priority

When multiple PRs are ready:

### Priority 1 (Merge First)
- Security fixes
- Critical bug fixes
- Infrastructure/dependency updates
- Database schema changes

### Priority 2 (Merge Second)
- Core feature implementations
- API changes
- Model changes

### Priority 3 (Merge Third)
- UI/UX improvements
- Non-critical features
- Refactoring
- Documentation

### Priority 4 (Merge Last)
- Experimental features
- Optional enhancements
- Style changes

---

## Handling Conflicts

### When Conflicts Occur

1. **Fetch latest main**:
   ```bash
   git fetch origin main
   ```

2. **Merge main into your branch**:
   ```bash
   git checkout your-branch
   git merge origin/main
   ```

3. **Resolve conflicts**:
   - Use your IDE's merge tool
   - Understand both changes before deciding
   - Test after resolving
   - Commit the resolution

4. **Verify**:
   ```bash
   npm install
   npm run test -- --run
   npm run build
   ```

5. **Push**:
   ```bash
   git push origin your-branch
   ```

### Common Conflict Patterns

#### Pattern 1: Both added same feature
**Resolution**: Keep both, ensure they work together

#### Pattern 2: Overlapping refactors
**Resolution**: Adopt one approach, apply it consistently

#### Pattern 3: Different formatting
**Resolution**: Use project's linting rules

---

## Communication

### Before Starting Work
1. Check open PRs for related changes
2. Comment on related PRs if you'll be touching same files
3. Consider collaborating instead of parallel work

### During Development
1. Keep PR updated with main regularly
2. Respond to review comments promptly
3. Update PR description if scope changes

### Before Merging
1. Ensure no other PRs are blocked by yours
2. Notify team of infrastructure changes
3. Update documentation if needed

---

## Tools and Automation

### Recommended VS Code Settings

```json
{
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.pruneOnFetch": true,
  "editor.formatOnSave": true,
  "files.autoSave": "onFocusChange"
}
```

### Git Aliases

Add to `~/.gitconfig`:

```ini
[alias]
  # Update branch with main
  sync = !git fetch origin && git merge origin/main

  # Check for conflicts without merging
  check-conflicts = !git fetch origin && git merge-tree $(git merge-base HEAD origin/main) origin/main HEAD

  # List files that conflict with main
  conflict-files = !git diff --name-only origin/main...HEAD

  # Pretty log
  lg = log --graph --oneline --all --decorate
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run tests before committing
npm run test -- --run --reporter=basic
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

---

## Repository Structure Improvements

### Suggested Refactoring

```
server/
  ├── routes/
  │   ├── auth.routes.ts       # Auth endpoints
  │   ├── posts.routes.ts      # Post CRUD
  │   ├── stories.routes.ts    # Stories
  │   ├── users.routes.ts      # User management
  │   ├── chat.routes.ts       # Chat/messaging
  │   └── admin.routes.ts      # Admin endpoints
  ├── middleware/
  │   ├── auth.middleware.ts
  │   ├── security.middleware.ts
  │   └── rateLimit.middleware.ts
  ├── services/
  │   ├── notification.service.ts
  │   ├── telegram.service.ts
  │   └── upload.service.ts
  └── index.ts                 # Main server file

src/
  ├── components/
  │   ├── Feed/               # Feed-related components
  │   ├── Stories/            # Story-related components
  │   ├── Chat/               # Chat components
  │   └── Shared/             # Shared components
  ├── contexts/               # React contexts
  ├── hooks/                  # Custom hooks
  ├── services/               # API clients
  ├── utils/                  # Utilities
  └── App.tsx                 # Main app (smaller)
```

### Benefits
- Smaller files = fewer conflicts
- Easier to review and test
- Better separation of concerns
- Multiple devs can work simultaneously

---

## Summary

**Key Takeaways**:
1. Keep PRs small and focused
2. Check for existing PRs before starting
3. Merge in priority order
4. Refactor large files into modules
5. Communicate about overlapping work

**Next Steps**:
1. Implement sequential merge strategy for current PRs
2. Set up git aliases and hooks
3. Plan refactoring of `server.ts` and `App.tsx`
4. Document high-risk files for the team
