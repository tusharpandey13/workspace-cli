# Implementation Plan: TTY Prompt Testing E2E

## ANALYZE

- **Problem**: User reports that the workspace overwrite prompt is only visible when piped to `cat` but not during normal terminal usage, indicating TTY/readline interaction issues with progress bars.
- **Core Issue**: The current fix doesn't fully resolve the TTY prompt visibility problem - progress bar interferes with readline prompt display in true TTY environments.
- **Testing Gap**: No E2E tests exist to verify prompt visibility in different terminal conditions (TTY vs non-TTY, piped vs direct).
- **Affected Files**: `e2e/test-prompt-visibility.sh`, `e2e/helpers.sh` (extend), `test/tty-prompt-test.js` (unit test)
- **Risks**:
  - TTY testing can be environment-dependent
  - Bash scripting complexity for simulating different terminal conditions
  - False positives/negatives based on testing environment

## PLAN

### Phase 1: Research and Setup

- [ ] Create comprehensive TTY prompt testing script in `e2e/test-prompt-visibility.sh`
- [ ] Extend `e2e/helpers.sh` with TTY-specific test helper functions
- [ ] Research Node.js TTY testing patterns from readline test examples

### Phase 2: TTY Testing Infrastructure

- [ ] Implement `test_tty_prompt_visibility()` function to simulate different terminal conditions
- [ ] Add `test_prompt_with_pipe()` function to test piped output behavior
- [ ] Add `test_prompt_direct_tty()` function to test direct terminal interaction
- [ ] Add `simulate_user_input()` helper to provide automated yes/no responses
- [ ] Add `capture_prompt_output()` to verify prompt text appears in output

### Phase 3: Specific Test Cases

- [ ] **TEST-TTY-01**: Test workspace overwrite prompt visibility in direct TTY mode
- [ ] **TEST-TTY-02**: Test workspace overwrite prompt visibility when piped to `cat`
- [ ] **TEST-TTY-03**: Test prompt visibility with progress bar active (main issue)
- [ ] **TEST-TTY-04**: Test prompt visibility with progress bar paused/resumed
- [ ] **TEST-TTY-05**: Test non-interactive mode (--silent) bypasses prompts correctly
- [ ] **TEST-TTY-06**: Test that progress bar doesn't interfere with other outputs

### Phase 4: Integration Testing

- [ ] Integrate TTY tests into main `e2e/test-suite.sh`
- [ ] Add TTY test execution to CI/testing pipeline considerations
- [ ] Create test workspace cleanup procedures for TTY tests

### Phase 5: Bug Fix Validation (if needed)

- [ ] Use TTY tests to validate current handleExistingWorkspace fix
- [ ] Identify remaining TTY interaction issues through test failures
- [ ] Document TTY behavior differences and expected outcomes

### Phase 6: Documentation and Handoff

- [ ] Document TTY testing approach and limitations
- [ ] Add usage examples for running TTY-specific tests
- [ ] Create troubleshooting guide for TTY test failures

## TESTING APPROACH

### Key Testing Strategies:

1. **Mock TTY vs Real TTY**: Use both approach to validate behavior
2. **Pipe Detection**: Test `process.stdout.isTTY` behavior in different scenarios
3. **Progress Bar Interference**: Verify progress indicators don't consume TTY control
4. **Automated Input**: Use `echo` and pipes to simulate user responses
5. **Output Capture**: Verify prompt text appears in the right output streams

### Test Environment Variables:

- `TERM=dumb` - Disable terminal features
- `CI=true` - Simulate CI environment
- `NODE_ENV=test` - Test mode
- `WORKSPACE_DISABLE_PROGRESS=1` - Disable progress bars for isolation

## NOTES

- TTY testing is inherently complex due to terminal environment variations
- Some tests may need to be marked as flaky or environment-dependent
- The main focus is ensuring prompts are visible regardless of TTY state
- Progress bar integration is the key area of concern based on user report
