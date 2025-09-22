# Implementation Plan: Fix Clean Command --force Flag

## ANALYZE

- **Problem**: The clean command expects `--force` and `--dry-run` flags but they are not defined in the command registration
- **Affected Files**: `src/commands/clean.ts`
- **Risks**: This is a straightforward command option addition with no breaking changes
- **Root Cause**: The `cleanCommand()` function defines the commander action but missing the `.option()` calls for `--force` and `--dry-run` flags

## PLAN

- [ ] Add `--force` option to the clean command definition with appropriate description
- [ ] Add `--dry-run` option to the clean command definition with appropriate description
- [ ] Update the action callback to extract options from the command object and pass them to `cleanWorkspace()`
- [ ] Ensure the options interface matches the expected `CleanOptions` type
- [ ] Test the fix by running the actual CLI command

## NOTES

- The cleanWorkspace() function already handles the force and dryRun options correctly
- The CleanOptions interface is already defined properly
- Just need to bridge the command-line options to the function parameters
- This follows the same pattern as the init command
