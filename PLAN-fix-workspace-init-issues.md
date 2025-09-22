# Implementation Plan: Fix Workspace Init Issues

## ANALYZE

- **Problem**: Multiple critical issues in workspace initialization causing brittle command execution
- **Root Cause**: Worktree logic fails when branches are in use, post-init command sanitization too strict, no cleanup on failures
- **Affected Files**: `src/services/gitWorktrees.ts`, `src/commands/init.ts`, `src/utils/validation.ts`, tests
- **Risks**: Command continues to fail intermittently, user frustration, workspace pollution

## PLAN

### Phase 1: Fix Worktree Branch Conflicts (HIGH PRIORITY)

- [ ] Modify `addWorktree` function in `gitWorktrees.ts` to handle branch-in-use conflicts
- [ ] Add logic to detect when target branch is used by another worktree
- [ ] Implement automatic worktree pruning of stale/dangling worktrees
- [ ] Add force flag support with proper error handling
- [ ] Test worktree conflict scenarios with existing branches

### Phase 2: Fix Post-Init Command Validation (HIGH PRIORITY)

- [ ] Review `validateShellArgument` function in `validation.ts` - identify why post-init command fails
- [ ] Update validation logic to allow legitimate shell commands (cd, &&)
- [ ] Test post-init command: 'cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i'
- [ ] Ensure validation doesn't reject valid shell constructs

### Phase 3: Implement Automatic Workspace Cleanup (MEDIUM PRIORITY)

- [ ] Add cleanup logic to `init.ts` that triggers on setup failures
- [ ] Implement `cleanupFailedWorkspace` function that removes partial workspace directories
- [ ] Add cleanup for worktrees, workspace directories, and any created files
- [ ] Test cleanup functionality with various failure scenarios

### Phase 4: Enhanced Error Handling & Recovery (MEDIUM PRIORITY)

- [ ] Improve error messages in worktree setup to provide actionable suggestions
- [ ] Add automatic recovery strategies (prune stale worktrees, retry with force)
- [ ] Implement better progress reporting during worktree operations
- [ ] Test error recovery scenarios

### Phase 5: Comprehensive Test Coverage (MEDIUM PRIORITY)

- [ ] Add test cases for worktree branch conflicts
- [ ] Add test cases for post-init command validation edge cases
- [ ] Add test cases for workspace cleanup on failures
- [ ] Add integration tests for complete init command failure scenarios
- [ ] Test with actual 'next' project configuration

### Phase 6: Code Quality & Documentation (LOW PRIORITY)

- [ ] Run `eslint --fix` and `prettier --write` across modified files
- [ ] Update documentation for worktree conflict handling
- [ ] Add inline comments explaining complex worktree logic

## VALIDATION CRITERIA

- All existing tests continue to pass (296/296)
- New tests cover identified edge cases
- `space init next 2326 bugfix/RT-same-scope-as-AT` command succeeds without errors
- Post-init command executes successfully
- Failed workspaces are automatically cleaned up
- Error messages provide actionable guidance

## NOTES

- Priority is fixing the immediate failures first, then improving robustness
- Need to maintain backward compatibility with existing workspace setups
- Test all changes against actual repositories (auth0-nextjs-samples)
