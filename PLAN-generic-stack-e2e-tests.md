# Implementation Plan: Generic Stack-Based E2E Tests

## ANALYZE

- **Problem**: Current E2E tests are coupled to specific Auth0 configs and use dry-run mode
- **Requirements**: Generic, stack-based, real execution tests with 100% coverage
- **Affected Files**: `e2e/` directory structure, need new stack-based test files
- **Tech Stacks**: JavaScript/TypeScript, Java (Gradle/Maven), Go, PHP, Python

## PLAN

### Phase 1: Create Generic Test Configuration Generator

- [ ] Create `e2e/stack-configs.sh` - generates test configs for each stack
- [ ] Remove coupling from specific project names in existing tests
- [ ] Create minimal test repositories for each stack type

### Phase 2: Create Stack-Based E2E Tests

- [ ] Create `e2e/test-stack-javascript.sh` - Node.js/npm ecosystem
- [ ] Create `e2e/test-stack-java.sh` - Java with Gradle/Maven
- [ ] Create `e2e/test-stack-go.sh` - Go modules ecosystem
- [ ] Create `e2e/test-stack-php.sh` - PHP/Composer ecosystem
- [ ] Create `e2e/test-stack-python.sh` - Python/pip ecosystem

### Phase 3: Comprehensive Real Execution Validation

- [ ] **Workspace Creation**: Verify git worktrees are created correctly
- [ ] **Environment Files**: Confirm .env files are copied to correct locations
- [ ] **Post-Init Commands**: Execute and validate post-init commands succeed
- [ ] **Sample Repository**: Verify sample repo is cloned correctly
- [ ] **File Structure**: Validate expected directory structure is created

### Phase 4: Update Main E2E Framework

- [ ] Modify `e2e/test-suite.sh` to call stack-based tests
- [ ] Remove Auth0-specific coupling from existing tests
- [ ] Add stack detection and validation utilities
- [ ] Update `e2e/helpers.sh` with stack-agnostic functions

### Phase 5: 100% Coverage Validation

- [ ] Test all CLI commands: init, list, info, clean, projects, setup
- [ ] Test all failure modes: invalid repos, missing configs, etc.
- [] Test all success scenarios: happy path workflows
- [ ] Validate cleanup and error recovery
- [ ] Performance and timeout testing

## IMPLEMENTATION NOTES

- Use real GitHub repositories that are lightweight but representative
- Each stack test should be independent and parallelizable
- Focus on actual functionality validation vs. configuration syntax
- Use timeout protection for all real execution tests
- Implement proper cleanup for failed tests

## SUCCESS CRITERIA

- All E2E tests run without `--dry-run`
- Each major tech stack has dedicated test coverage
- Tests validate actual workspace creation and functionality
- 100% command coverage with both success and failure scenarios
- Tests are generic and not coupled to specific project configurations
