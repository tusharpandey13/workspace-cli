# 🔧 Bug Fix & Test Implementation for GitHub IDs: {{GITHUB_IDS}}

<role>Expert NextJS-Auth0 SDK Developer implementing production-ready fixes</role>

<workflow_phase>IMPLEMENT</workflow_phase>

<thinking>
Following v2.chatmode.md implementation principles:
1. Small, testable increments that follow directly from the PLAN
2. Validate build configurations early - test compatibility immediately
3. Treat warnings and type errors as failures
4. Test behaviors, not implementation details
5. Cover failure modes and edge cases proactively
</thinking>

> ⏲ **Time-box:** Target **≤ 90 min** for initial fix & verification.

<context>
<workspace_path>{{WORKSPACE_PATH}}</workspace_path>
<branch>{{BRANCH_NAME}}</branch>
<bugreport_file>{{BUGREPORT_FILE}}</bugreport_file>
<github_data>{{GITHUB_DATA}}</github_data>
<related_issues>{{RELATED_ISSUES_PRS}}</related_issues>
<additional_context>{{ADDITIONAL_CONTEXT}}</additional_context>
</context>

## Prerequisite

Review the findings in `{{BUGREPORT_FILE}}` before starting implementation.

## Infrastructure Validation

**Before implementing fixes, verify testing infrastructure works:**

```bash
# Verify sample app testing infrastructure
cd {{SAMPLE_PATH}}
npm run test                # Should pass (or show specific issue-related failures)
npm run test:coverage       # Verify coverage reporting works

# Verify SDK testing works
cd {{SDK_PATH}}
pnpm run test              # Should pass existing tests
pnpm run build             # Should build successfully
```

**If infrastructure tests fail, fix infrastructure before proceeding with feature implementation.**

<domain_knowledge>

## Technical Context & Coding Guidelines

### Critical Anti-Patterns (Avoid These)

- **❌ Blocking main thread** - Use async/await patterns consistently
- **❌ Swallowing errors** - Always log and propagate errors appropriately
- **❌ Magic strings/numbers** - Use named constants and enums
- **❌ Side effects in pure functions** - Keep functions predictable
- **❌ Tight coupling** - Use dependency injection and interfaces
- **❌ Missing null checks** - Handle undefined/null states explicitly
  </domain_knowledge>

<implementation_workflow>

## Checklist

- [ ] **Verify testing infrastructure** (`cd {{SAMPLE_PATH}} && npm run test`)
- [ ] Reproduce failing behaviour using existing test scaffolding
- [ ] Locate and patch SDK code
- [ ] Build & publish SDK (`pnpm build && yalc push`)
- [ ] Validate build output (`dist/*`, `*.d.ts`, `package.json` exports)
- [ ] Re-install in sample app & retest using pre-configured test scripts
- [ ] Extend existing unit & integration tests (don't create new test infrastructure)
- [ ] Ensure lint, type-check, and coverage pass
- [ ] Update docs / changelog
- [ ] **Self-Correction Check**: Validate fix addresses root cause, not just symptoms
      </implementation_workflow>

<self_correction_protocol>

## Implementation Self-Correction

Before considering the fix complete, ask yourself:

### Root Cause Validation

- [ ] **Does this fix address the actual root cause or just symptoms?**
- [ ] **Have I considered why this issue occurred in the first place?**
- [ ] **What prevents this issue from happening again?**

### Solution Quality Check

- [ ] **Is this the simplest solution that could work?**
- [ ] **Have I considered alternative approaches?**
- [ ] **Does this follow established SDK patterns and conventions?**

### Impact Assessment

- [ ] **Could this fix introduce new issues or regressions?**
- [ ] **Have I tested edge cases and error scenarios?**
- [ ] **Does this maintain backward compatibility?**

### Test Coverage Validation

- [ ] **Do my tests actually validate the fix works?**
- [ ] **Have I tested both success and failure scenarios?**
- [ ] **Would these tests catch this issue if it reoccurred?**
      </self_correction_protocol>

## Quick Testing Loop

**MANUAL EXECUTION REQUIRED** - Review each command before running:

```bash
# SDK worktree - Execute manually, verify each step
rm -rf dist && pnpm build && yalc push

# Sample worktree - Confirm build success before proceeding
pnpm install
pnpm test --run
pnpm dev
```

**⚠️ Human Verification Points**:

- Check build output for errors/warnings before proceeding
- Manually review test results for false positives/negatives
- Verify dev server starts without configuration errors

### Vitest Test Skeleton (put in `{{SDK_PATH}}/tests/{{TEST_FILE_NAME}}.test.ts`)

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// TODO: import target function / setup mocks

describe(`{{TEST_FILE_NAME}} - {{ISSUE_TITLE}} regression`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Happy Path', () => {
    it('should …', async () => {
      // Arrange

      // Act

      // Assert
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle …', async () => {
      // …
    });
  });
});
```

## Requirements

- **Backward compatibility**: No breaking changes without major version bump
- **Code style consistency**: Follow existing patterns & conventions exactly
- **Comprehensive error handling**: Cover all failure modes with appropriate recovery
- **Edge-case testing**: Test boundary conditions and error scenarios
- **Descriptive debug logging**: Use scoped debug() calls for troubleshooting
- **Type safety**: Maintain strict TypeScript compliance throughout

## Recommended Enhancements

These refinements improve developer experience and build confidence. Make sure to integrate them where appropriate:

- **Build validation:** after building the SDK, verify `dist/*`, `*.d.ts`, and `package.json` `exports` fields.
- **Clean build loop:** use `rm -rf dist && pnpm build && yalc push` to avoid stale artifacts.
- **Immediate feedback:** in the sample app run `pnpm test --run` before starting `pnpm dev`.
- **Structured testing:** adopt the provided Vitest skeleton with `beforeEach`/`afterEach`, happy-path and edge-case suites.
- **Debug logging:** add `debug()` or similar scoped logs to surface state during failures.

## Definition of Done

1. All checklist items ticked.
2. `pnpm run test:coverage && pnpm run prepack && pnpm run lint` succeed.
3. Bug cannot be reproduced in sample app.

## Pull Request Description

Once all tasks are complete, prepare a thorough pull-request description:

1. Open the template `PR_DESCRIPTION_TEMPLATE.md`.
2. Follow **all** instructions in that template, filling in the required sections to reflect the changes implemented while fixing **#{{ISSUE_ID}} – {{ISSUE_TITLE}}**.
3. Save the filled-out description as `CHANGES_PR_DESCRIPTION.md` in the `nextjs-auth0` directory as `nextjs-auth0/CHANGES_PR_DESCRIPTION.md` in this workspace. This file will be used as the PR body when opening your pull request.

<handoff>
## Handoff to Next Phase
<implementation_complete>
<fix_status>{{FIX_STATUS}}</fix_status>
<tests_passing>{{TESTS_PASSING}}</tests_passing>
<build_status>{{BUILD_STATUS}}</build_status>
<pr_description_ready>{{PR_DESCRIPTION_READY}}</pr_description_ready>
<breaking_changes>{{BREAKING_CHANGES}}</breaking_changes>
</implementation_complete>

**Next recommended prompt:**

- If fix complete and tests pass: `review-changes.prompt.md`
- If additional testing needed: `tests.prompt.md`
- If issues found: Return to `analysis.prompt.md`
  </handoff>
