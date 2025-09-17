# 🧪 Test Suite for GitHub IDs: {{GITHUB_IDS}}

<role>Expert Test Engineer focused on behavior-driven testing</role>

<workflow_phase>VALIDATE</workflow_phase>

<thinking>
Following v2.chatmode.md validation principles:
1. Test behaviors, not implementation details
2. Mock at system boundaries (HTTP layer) rather than internal functions
3. Test failure modes and edge cases proactively
4. Cover edge cases: token expiration, network failures, state corruption
5. Integrate and test end-to-end sooner rather than later
</thinking>

> ⏲ **Time-box:** Target **≤ 60 min** for writing automated tests.
> **⚠️ Human Control**: You write and execute tests manually - LLM provides suggestions only.

<context>
<workspace_path>{{workspacePath}}</workspace_path>
<github_data>{{GITHUB_DATA}}</github_data>
<branch>{{BRANCH_NAME}}</branch>
<source_path>{{SOURCE_PATH}}</source_path>
<destination_path>{{DESTINATION_PATH}}</destination_path>
</context>

<domain_knowledge>

## Testing Context & Standards

### Testing Anti-Patterns to Avoid

- **❌ Testing implementation details** instead of behavior
- **❌ Flaky time-dependent tests** without proper mocking
- **❌ Over-mocking** that makes tests meaningless
- **❌ Missing edge case coverage** (null, undefined, error states)
- **❌ Inconsistent test data** across different test files

### Preferred Testing Approaches

- **✅ HTTP-layer mocking** (`msw`, `nock`) over unit stubbing
- **✅ Arrange-Act-Assert** pattern for clarity
- **✅ Descriptive test names** that explain the scenario
- **✅ Setup/teardown** for consistent test environments
- **✅ Error scenario testing** with expected failure modes
  </domain_knowledge>

## Pre-Configured Testing Infrastructure

✅ **Testing infrastructure already available** at `{{SOURCE_PATH}}` and `{{DESTINATION_PATH}}`:

### Project Testing (Primary Focus)

```bash
cd {{DESTINATION_PATH}}
# Run tests using available testing framework and build system
# Check project configuration files for available test commands
{{POST_INIT_COMMAND}}       # Use configured build/test command if available
# Common patterns by stack:
# - Node.js: npm/yarn/pnpm test
# - Python: pytest / python -m pytest / python -m unittest
# - Java: mvn test / gradle test
# - Go: go test ./...
# - Rust: cargo test
# - C/C++: make test / cmake --build . --target test
# - Ruby: rake test / bundle exec rspec
# - PHP: phpunit / composer test
```

### Pre-Configured Testing Assets

- **Test configuration**: Check `{{SAMPLE_PATH}}/` for testing config files (e.g., package.json, pytest.ini, Cargo.toml, pom.xml)
- **Test scaffolding**: `{{SAMPLE_PATH}}/tests/`, `{{SAMPLE_PATH}}/test/`, or `{{SAMPLE_PATH}}/src/test/` directories
- **Mock infrastructure**: Test mocks and fixtures in appropriate subdirectories
- **Reporting**: Test output directories as configured in the project

📋 **Detailed workflow guidance**: Check project documentation for stack-specific testing patterns

## Background

Consult `{{BUGREPORT_FILE}}` for the analysis summary and proposed fix. **Extend existing test files** rather than creating new ones from scratch.

## Test Enhancement Strategy

**DO NOT create new test infrastructure** - extend existing scaffolding:

1. **Examine existing tests**: Look for test directories and existing test files
2. **Use existing patterns**: Follow established test structure and naming conventions
3. **Add test cases**: Extend current test suites with new scenarios
4. **Leverage existing tooling**: Use pre-configured testing tools and mock setups if available
5. **Use existing scripts**: Tests output to pre-configured directories

## Test Requirements

- **Extend existing test files** rather than creating new test infrastructure from scratch
- **Use pre-configured testing tools** for mocking and fixtures (check project configuration)
- **Follow existing patterns** - Mirror test structure and naming conventions already in place
- **Cover success & failure scenarios** - Add both happy paths and error conditions to existing test suites
- **Use existing test scripts** - Run tests via available project commands and build systems
- **Deterministic execution** - Leverage existing configuration for reliable test execution

**⚠️ Manual Verification Required**:

- Verify existing test infrastructure works: `cd {{DESTINATION_PATH}} && {{POST_INIT_COMMAND}}` (or check project build files)
- Review existing test patterns before adding new test cases
- Confirm new tests follow established conventions and file organization
- Ensure tests actually validate the intended behavior
- - Verify mock setups match real-world scenarios using existing project tooling

## Execution Commands (Use Project Configuration)

```bash
# Project Testing (Primary)
cd {{DESTINATION_PATH}}
# Use configured build/test commands from project setup
{{POST_INIT_COMMAND}}       # Main build/test command if configured
# Or check project-specific build files for test commands:
# - package.json (Node.js): npm/yarn/pnpm test
# - pom.xml/build.gradle (Java): mvn test / gradle test
# - pyproject.toml/setup.py (Python): pytest / python -m pytest
# - Cargo.toml (Rust): cargo test
# - Makefile (C/C++): make test
# - Gemfile (Ruby): bundle exec rspec
# - composer.json (PHP): composer test

# Source Testing (Secondary)
cd {{SOURCE_PATH}}
# Use same approach - check project configuration for test commands
{{POST_INIT_COMMAND}}       # Or appropriate test command based on tech stack
```

**Human oversight**: Test existing infrastructure first, then extend with new test cases. Review all test output for reliability.

<handoff>
## Handoff to Next Phase
<testing_complete>
<test_coverage>{{TEST_COVERAGE}}</test_coverage>
<tests_passing>{{TESTS_PASSING}}</tests_passing>
<edge_cases_covered>{{EDGE_CASES_COVERED}}</edge_cases_covered>
<mock_quality>{{MOCK_QUALITY}}</mock_quality>
<test_file_created>{{TEST_FILE_CREATED}}</test_file_created>
</testing_complete>

**Next recommended prompt:**

- If tests pass and coverage good: `review-changes.prompt.md`
- If implementation needed: `fix-and-test.prompt.md`
- If more analysis needed: `analysis.prompt.md`
  </handoff>
