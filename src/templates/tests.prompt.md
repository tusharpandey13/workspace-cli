## Test Suite for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:** Target **≤ 60 min** for writing automated tests.
> **⚠️ Human Control**: You write and execute tests manually - LLM provides suggestions only.

**Workspace**: {{WORKSPACE_PATH}}  
**SDK Path**: {{SDK_PATH}}

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
- **✅ Error scenario testing** with expected failure modes Suite for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:** Target **≤ 60 min** for writing automated tests.

**Workspace**: {{WORKSPACE_PATH}}  
**SDK Path**: {{SDK_PATH}}

## Background
Consult `{{BUGREPORT_FILE}}` for the analysis summary and proposed fix. Use it to guide test scenarios.

## Minimal Vitest Skeleton
Create `{{SDK_PATH}}/tests/{{TEST_FILE_NAME}}.test.ts` with:
```ts
import { describe, it, expect } from 'vitest';
// import subject under test

describe('{{TEST_FILE_NAME}}', () => {
  it('happy path', async () => {
    // Arrange

    // Act

    // Assert
    expect(true).toBe(true);
  });

  it('failure path', async () => {
    // Arrange

    // Act & Assert
    await expect(async () => {/* call */}).rejects.toThrow();
  });
});
```

## Test Requirements
- **HTTP-layer mocking** (`msw`, `nock`) over unit stubbing for realistic testing
- **Mirror existing patterns** - Follow established test conventions in the codebase
- **Cover success & failure scenarios** - Test both happy paths and error conditions
- **Deterministic execution** - No network or time-based flakiness
- **Comprehensive coverage** - Include edge cases and boundary conditions

**⚠️ Manual Verification Required**:
- Review generated test logic before execution
- Confirm tests actually validate the intended behavior
- Verify mock setups match real-world scenarios
- Ensure tests fail when they should and pass when they should

## Execution Commands
```bash
cd {{SDK_PATH}}
# Unit tests with coverage
pnpm run test:coverage && pnpm run prepack && pnpm run lint

# E2E tests (if applicable)  
pnpm run test:e2e
```

**Human oversight**: Manually review test output for false positives/negatives before proceeding.
