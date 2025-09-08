# 🧪 Test Suite for GitHub IDs: {{GITHUB_IDS}}

<role>Expert Test Engineer focused on behavior-driven testing for Auth0 SDK</role>

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
<workspace_path>{{WORKSPACE_PATH}}</workspace_path>
<sdk_path>{{SDK_PATH}}</sdk_path>
<bugreport_file>{{BUGREPORT_FILE}}</bugreport_file>
<test_file_name>{{TEST_FILE_NAME}}</test_file_name>
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

✅ **Testing infrastructure already available** at `{{SDK_PATH}}` and `{{SAMPLE_PATH}}`:

### Sample App Testing (Primary Focus)

```bash
cd {{SAMPLE_PATH}}
npm run test                # Run unit tests with pre-configured vitest
npm run test:watch          # Development mode testing
npm run test:e2e            # End-to-end tests with playwright
npm run test:coverage       # Coverage reports
npm run test:debug          # Debug test failures
```

### Pre-Configured Assets

- **Vitest config**: `{{SAMPLE_PATH}}/vitest.config.ts` (jsdom, coverage, reporters)
- **Test scaffolding**: `{{SAMPLE_PATH}}/tests/` (auth.test.ts, setup.ts, utils/)
- **MSW mocking**: `{{SAMPLE_PATH}}/tests/mocks/` (handlers, server setup)
- **Reporting**: `{{SAMPLE_PATH}}/test-results/`, `{{SAMPLE_PATH}}/coverage/`

📋 **Detailed workflow guidance**: See `sample-app-testing-workflows.md` for app-type specific patterns

## Background

Consult `{{BUGREPORT_FILE}}` for the analysis summary and proposed fix. **Extend existing test files** rather than creating new ones from scratch.

## Test Enhancement Strategy

**DO NOT create new test infrastructure** - extend existing scaffolding:

1. **Examine existing tests**: `{{SAMPLE_PATH}}/tests/auth.test.ts`
2. **Use existing patterns**: Follow established test structure and MSW handlers
3. **Add test cases**: Extend current test suites with new scenarios
4. **Leverage existing mocks**: Use pre-configured Auth0 API mocking
5. **Use existing reporters**: Tests output to pre-configured directories

## Test Requirements

- **Extend existing test files** in `{{SAMPLE_PATH}}/tests/` rather than creating new ones
- **Use pre-configured MSW handlers** for Auth0 API mocking (check `{{SAMPLE_PATH}}/tests/mocks/`)
- **Follow existing patterns** - Mirror test structure and naming conventions already in place
- **Cover success & failure scenarios** - Add both happy paths and error conditions to existing test suites
- **Use existing test scripts** - Run tests via `npm run test`, `npm run test:e2e`, `npm run test:coverage`
- **Deterministic execution** - Leverage existing MSW configuration for reliable mocking

**⚠️ Manual Verification Required**:

- Verify existing test infrastructure works: `cd {{SAMPLE_PATH}} && npm run test`
- Review existing test patterns before adding new test cases
- Confirm new tests follow established conventions and file organization
- Ensure tests actually validate the intended behavior
- Verify mock setups match real-world scenarios using existing MSW handlers

## Execution Commands (Use Pre-Configured Scripts)

```bash
# Sample App Testing (Primary)
cd {{SAMPLE_PATH}}
npm run test                # Run unit tests (uses vitest --run)
npm run test:watch          # Development mode
npm run test:coverage       # Coverage with HTML reports
npm run test:e2e            # Playwright E2E tests
npm run test:debug          # Debug test failures

# SDK Testing (Secondary)
cd {{SDK_PATH}}
pnpm run test:coverage && pnpm run prepack && pnpm run lint
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
