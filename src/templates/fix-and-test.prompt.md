# Bug Fix & Test Implementation for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:** Target **≤ 90 min** for initial fix & verification.

**Workspace**: {{WORKSPACE_PATH}}  
**Branch**: {{BRANCH_NAME}}

## Prerequisite
Review the findings in `{{BUGREPORT_FILE}}` before starting implementation.

## GitHub Issues/PRs Context
{{GITHUB_DATA}}

## Related Issues & PRs (User Input)
{{RELATED_ISSUES_PRS}}

## Additional Context (User Input)
{{ADDITIONAL_CONTEXT}}

## Technical Context & Coding Guidelines
### Critical Anti-Patterns (Avoid These)
- **❌ Blocking main thread** - Use async/await patterns consistently
- **❌ Swallowing errors** - Always log and propagate errors appropriately
- **❌ Magic strings/numbers** - Use named constants and enums
- **❌ Side effects in pure functions** - Keep functions predictable
- **❌ Tight coupling** - Use dependency injection and interfaces
- **❌ Missing null checks** - Handle undefined/null states explicitly

## Checklist
- [ ] Reproduce failing behaviour in sample app  
- [ ] Locate and patch SDK code  
- [ ] Build & publish SDK (`pnpm build && yalc push`)  
- [ ] Validate build output (`dist/*`, `*.d.ts`, `package.json` exports)  
- [ ] Re-install in sample app & retest  
- [ ] Add/expand unit & integration tests  
- [ ] Ensure lint, type-check, and coverage pass  
- [ ] Update docs / changelog

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