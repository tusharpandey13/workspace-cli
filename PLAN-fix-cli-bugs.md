# Implementation Plan: Fix CLI Bugs

## ANALYZE

- **Problem 1**: `error: unknown command 'node'` when executing `space init spa 1318 1319 feature/something` through interactive workflow
- **Problem 2**: Force flag incorrectly required when cleaning from the prompt interface
- **Problem 3**: Branch name format restriction - should accept `feature/something` in addition to `feature_something`
- **Affected Files**: `src/bin/workspace.ts`, `src/commands/clean.ts`, workspace path resolution logic
- **Risks**: Command execution flow, CLI argument parsing, workspace name resolution consistency

## PLAN

- [x] **Bug 1**: Fix CLI command execution in interactive init workflow - parse arguments correctly
- [x] **Bug 2**: Update clean command logic to auto-add force flag when called from interactive menu (already working correctly)
- [x] **Bug 3**: Ensure branch name validation accepts slashes and workspace resolution handles both formats (already working correctly)
- [x] Test all three fixes with the exact failing scenarios provided
- [x] Verify no regressions in existing functionality
- [x] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` across modified files

## NOTES

- Bug 1: The `parseAsync` call in interactive init workflow needs to be properly structured
- Bug 2: Interactive clean should not require explicit `--force` flag from user
- Bug 3: Branch names like `feature/something` should work and be cleaned as `feature_something`
