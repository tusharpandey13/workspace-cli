# Implementation Plan: Fix Post-Init Error Handling and Progress Bar Coordination

## ANALYZE

- **Problem**: Post-init command failures cause corrupted output with progress bar, incorrect success messages, and poor error flow
- **Affected Files**: `src/commands/init.ts` - specifically `executePostInitCommand` and `initializeWorkspace` functions
- **Risks**: Breaking existing successful post-init flows, progress bar state management

## PLAN

- [ ] Create new interface `PostInitResult` to return both success status and captured output
- [ ] Modify `executePostInitCommand` to return result object instead of throwing
- [ ] Update `initializeWorkspace` to handle post-init results properly with progress coordination
- [ ] Ensure progress bar is completed/paused before any error output
- [ ] Change success messaging: "Workspace initialized, post init failed" when post-init fails
- [ ] Buffer and display post-init error output cleanly after progress completion
- [ ] Add similar fixes to `initializeAnalysisOnlyWorkspace` function
- [ ] Test with both successful and failing post-init commands
- [ ] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` on modified files

## NOTES

- Need to coordinate progress bar state with error output display
- Must preserve existing successful post-init behavior
- Error output should be clean and readable, not mixed with progress indicators
- The flow should be: complete workspace setup → show status → then show detailed errors if any
