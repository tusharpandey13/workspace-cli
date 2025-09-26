# Implementation Plan: Fix E2E Dry-Run Issue

## ANALYZE

- **Problem**: E2E tests for Auth0 factory configurations only use `--dry-run` mode, not testing actual workspace creation
- **Affected Files**: `e2e/auth0-helpers.sh`, `e2e/test-auth0-factory-configs.sh`
- **Risks**: Factory configurations may have issues in real execution that dry-run doesn't catch

## PLAN

- [ ] **Phase 1: Create Non-Dry-Run Test Functions**
  - [ ] Create `test_space_init_real()` function that runs without `--dry-run`
  - [ ] Add workspace cleanup functions for real test directories
  - [ ] Add timeout protection for potentially longer real operations

- [ ] **Phase 2: Implement Tiered Testing Strategy**
  - [ ] Quick validation tests using `--dry-run` (existing functionality)
  - [ ] Full integration tests without `--dry-run` (new functionality)
  - [ ] Sample subset testing for performance (test 3-4 repos fully, rest with dry-run)

- [ ] **Phase 3: Update Test Framework**
  - [ ] Modify `test_space_init_basic()` to accept dry-run as parameter
  - [ ] Add real workspace validation functions
  - [ ] Update cleanup mechanisms for actual workspace directories

- [ ] **Phase 4: Validate Auth0 Factory Configurations**
  - [ ] Test at least 3-4 Auth0 repositories with full execution
  - [ ] Verify post-init commands actually run
  - [ ] Validate environment files are properly copied
  - [ ] Confirm git worktrees are created correctly

- [ ] **Phase 5: Performance & Safety**
  - [ ] Add workspace isolation to prevent conflicts
  - [ ] Implement proper cleanup for failed tests
  - [ ] Add progress reporting for long-running real tests
  - [ ] Set appropriate timeouts for real operations (longer than dry-run)

## IMPLEMENTATION NOTES

- Real execution tests will be slower but more accurate
- Need proper cleanup to prevent workspace pollution
- Should maintain existing dry-run tests for quick validation
- Focus on representative Auth0 repos rather than all 14 for full execution

## SUCCESS CRITERIA

- Both dry-run and real execution tests available
- At least 3-4 Auth0 repositories tested with full workspace creation
- All factory configurations validated to actually work
- No regression in existing test functionality
