# Implementation Plan: Fix Git Worktree Branch Issues

## ANALYZE

- **Problem**: Git worktree setup fails for branch names with slashes when the branch doesn't exist remotely
- **Root Cause**: Multiple issues in git worktree logic:
  1. Branch existence validation happens locally but branch may not exist remotely
  2. Cleanup attempts to delete non-existent branches
  3. Samples branch naming transformation not applied everywhere
  4. Branch creation logic doesn't handle slash-containing branches properly
- **Affected Files**: `src/services/gitWorktrees.ts`, potentially cleanup logic
- **Current Behavior**:
  - `git show-ref --verify --quiet refs/heads/bugfix/RT-same-scope-as-AT` fails (branch doesn't exist)
  - `git branch -D bugfix/RT-same-scope-as-AT` fails (branch doesn't exist)
- **Expected Behavior**: Should create branches from remote/main when they don't exist locally

## DESIGN

The solution must handle multiple scenarios:

1. **Branch doesn't exist locally or remotely**: Create from remote/main
2. **Branch exists remotely but not locally**: Create local tracking branch
3. **Branch exists locally**: Use existing branch
4. **Cleanup logic**: Only attempt to delete branches that actually exist
5. **Error handling**: Graceful handling of git command failures
6. **Samples branch**: Apply transformation consistently everywhere

## PLAN

- [ ] Analyze current git worktree setup logic thoroughly
- [ ] Identify all places where branch operations occur
- [ ] Fix branch existence checking to handle remote vs local branches
- [ ] Fix cleanup logic to check branch existence before deletion
- [ ] Ensure samples branch transformation is applied everywhere
- [ ] Create comprehensive test suite that covers all branch scenarios:
  - [ ] Branch exists locally and remotely
  - [ ] Branch exists remotely but not locally
  - [ ] Branch doesn't exist anywhere (create from main)
  - [ ] Branch with slashes in name
  - [ ] Samples repository branch handling
  - [ ] Cleanup with existing and non-existent branches
  - [ ] Error recovery scenarios
- [ ] Test with actual git repositories, not just mocks
- [ ] Validate fix works end-to-end with real GitHub repository

## NOTES

- Previous fix was incomplete - only addressed samples branch naming
- Need rigorous testing with real git operations, not just dry-run mode
- Must handle both local and remote branch scenarios
- Error handling needs to be robust
