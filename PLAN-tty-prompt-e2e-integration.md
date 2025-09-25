# Implementation Plan: TTY Prompt E2E Integration

## ANALYZE

- **Problem**: The existing E2E test matrix lacks coverage for interactive workspace overwrite prompts
- **Current State**: FAIL-03 tests duplicate workspace creation but uses `--non-interactive` flag
- **Missing Coverage**: Interactive TTY prompt visibility and user input handling
- **Affected Files**: `e2e/test-matrix.md`, `e2e/test-suite.sh`, `e2e/helpers.sh`
- **Risks**: Tests must handle TTY simulation, timeouts, and input automation

## PLAN

- [ ] Add new test cases to `e2e/test-matrix.md` for interactive workspace overwrite prompts
- [ ] Update `e2e/test-suite.sh` to include the new test cases in appropriate categories
- [ ] Add helper functions to `e2e/helpers.sh` for TTY prompt testing with automated input
- [ ] Test both successful overwrite confirmation (y) and cancellation (n) scenarios
- [ ] Ensure timeout protection and cleanup for interactive tests
- [ ] Validate that tests follow existing patterns and naming conventions
- [ ] **[LOW PRIORITY]** Run existing E2E suite to ensure no regressions

## NOTES

- Interactive tests need special handling for input automation using `echo 'y' |` or `printf 'n\n' |`
- Must follow existing timeout patterns (60s standard, 120s for init commands)
- Should be categorized as EDGE case tests since they test interactive behavior
- Need to ensure proper cleanup of workspaces created during testing
