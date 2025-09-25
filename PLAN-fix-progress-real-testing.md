# Implementation Plan: Fix Progress Bar Issues - Real CLI Testing

## ANALYZE

- **Problem**: Multiple progress bars rendering simultaneously, hidden prompts, corrupted display, emoji duplication
- **Root Cause**: cli-progress is not properly clearing previous bars, readline interfering with progress display
- **Current Status**: My previous fixes failed because I wasn't testing the real CLI behavior properly
- **Evidence**: User output shows 3 progress bars, "0/8y" corruption, missing cleanup tracking

## PLAN

### Phase 1: Establish Proper Testing Strategy (Critical)

- [ ] **Task 1.1**: Create E2E test that captures intermediate CLI output
  - [ ] Add test script that captures stdout/stderr during CLI execution
  - [ ] Use script or expect tool to capture real terminal output including prompts
  - [ ] Create baseline test that reproduces the exact user issues

- [ ] **Task 1.2**: Create manual testing script with output capture
  - [ ] Script that runs CLI command and captures all intermediate output
  - [ ] Test with existing workspace to trigger overwrite prompt
  - [ ] Save output to files for analysis

- [ ] **Task 1.3**: Investigate cli-progress clearOnComplete behavior
  - [ ] Review cli-progress documentation for proper cleanup
  - [ ] Test different cli-progress configurations
  - [ ] Identify why progress bars aren't clearing properly

### Phase 2: Fix Progress Bar Clearing Issues

- [ ] **Task 2.1**: Fix progress bar cleanup
  - [ ] Ensure each progress bar properly clears before next one starts
  - [ ] Use clearOnComplete: true and proper stop() calls
  - [ ] Test multiple progress bars don't accumulate

- [ ] **Task 2.2**: Fix readline prompt visibility
  - [ ] Properly stop progress bar before readline
  - [ ] Clear terminal line completely before prompt
  - [ ] Ensure prompt is visible and input doesn't bleed into progress

- [ ] **Task 2.3**: Fix step progression tracking
  - [ ] Ensure cleanup step is properly tracked (should show 1/8, not 0/8)
  - [ ] Fix weight calculations for all steps
  - [ ] Validate step progression matches expected sequence

### Phase 3: Remove All Emoji Duplication

- [ ] **Task 3.1**: Clean up all emoji usage
  - [ ] Remove ✅ from completion messages
  - [ ] Ensure only one emoji source (either logger or message, not both)
  - [ ] Clean, professional output without emoji clutter

### Phase 4: Comprehensive E2E Testing

- [ ] **Task 4.1**: Create comprehensive E2E test suite
  - [ ] Test normal initialization (no existing workspace)
  - [ ] Test with existing workspace (overwrite prompt)
  - [ ] Test with GitHub validation
  - [ ] Capture and validate all intermediate output

- [ ] **Task 4.2**: Validate user scenarios match expected output
  - [ ] Single progress bar throughout operation
  - [ ] Visible prompts when needed
  - [ ] Clean completion without leftover progress bars
  - [ ] No corrupted text or user input bleeding

## IMPLEMENTATION APPROACH

1. **Evidence-based testing**: Capture real CLI output at each phase
2. **Progressive fixing**: Fix one issue at a time with validation
3. **User scenario matching**: Ensure fixes match user's exact use case
4. **E2E validation**: Test complete user workflows, not isolated components

## SUCCESS CRITERIA

- Single progress bar visible at any time
- Prompts are clearly visible when needed
- No text corruption or input bleeding
- Clean completion without leftover progress bars
- Professional output without emoji duplication

## NOTES

- Previous approach of testing in isolation was insufficient
- Need to observe real CLI behavior during execution
- cli-progress requires careful cleanup to prevent accumulation
- readline integration needs proper terminal management
