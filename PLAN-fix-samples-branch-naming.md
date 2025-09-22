# Implementation Plan: Fix Samples Branch Naming Issue

## ANALYZE

- **Problem**: When initializing a workspace with a branch name containing slashes (e.g., `bugfix/RT-same-scope-as-AT`), the samples worktree creation fails because it tries to create a branch named `bugfix/RT-same-scope-as-AT-samples`
- **Root Cause**: The `setupWorktrees` function blindly appends `-samples` to the branch name without considering that the original branch might contain path separators
- **Affected Files**: `src/services/gitWorktrees.ts`
- **Current Behavior**: `git show-ref --verify --quiet refs/heads/bugfix/RT-same-scope-as-AT-samples` fails because this branch doesn't exist
- **Expected Behavior**: Samples worktree should be created successfully with a properly formatted branch name

## DESIGN

The solution should:

1. Transform branch names containing slashes into valid samples branch names
2. Preserve the semantic meaning of the original branch
3. Avoid conflicts with existing branch naming conventions
4. Be reversible/predictable for debugging

**Proposed Transformation Logic**:

- Replace forward slashes with dashes or underscores in the samples branch name
- Example: `bugfix/RT-same-scope-as-AT` → `bugfix-RT-same-scope-as-AT-samples`

## PLAN

- [ ] Analyze the current `setupWorktrees` function to understand the samples branch creation logic
- [ ] Create a helper function `createSamplesBranchName()` that safely transforms branch names
- [ ] Update the `setupWorktrees` function to use this helper function
- [ ] Add unit tests for the branch name transformation logic
- [ ] Add integration tests for worktree creation with slash-containing branch names
- [ ] Validate that existing functionality still works for simple branch names
- [ ] Test edge cases (multiple slashes, special characters, etc.)
- [ ] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` across modified files

## NOTES

- We need to ensure backward compatibility with existing workspaces
- The transformation should be consistent and predictable
- Consider logging the transformation so users can see what samples branch name is being used
