# Issue & PR Analysis for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:** Aim to finish this analysis in **≤ 30 min**.

## GitHub Issues/PRs Context (extracted from GitHub API)
{{GITHUB_DATA}}

## Related Issues & PRs (User Input)
{{RELATED_ISSUES_PRS}}

## Additional Context (User Input)
{{ADDITIONAL_CONTEXT}}

## Workspace Overview
| Area | Path |
|------|------|
| SDK Worktree | `{{SDK_PATH}}` (branch `{{BRANCH_NAME}}`) |
| Sample Apps  | `{{SAMPLE_PATH}}` |

### Key SDK files
{{SDK_KEY_FILES}}

### Key Sample files
{{SAMPLE_KEY_FILES}}

## Technical Context & Patterns
### Preferred Solutions & Patterns
- **Defensive programming** - Validate all inputs and auth states
- **Immutable updates** - Avoid mutating objects directly
- **Proper error propagation** - Use structured error handling
- **TypeScript strict mode** - Leverage type safety throughout

## Automated Reproduction Attempt & Test Harness
Write automated tests (e2e and unit) for the sample app that accurately reproduce the issue.
The tests should fail if the issue is reproduced and pass if issue is not found.
Do not rely on manual testing (running the server, sending curl commands etc) instead, automate
the process and make it deterministic with test files.
Use vitest for unit tests, always run tests with the argument "--run" to avoid waiting for user input at the end of test execution.
For e2e tests, use playwright.
Do not use package.json scripts to run tests, instead use vitest and playwright
Output test logs to their own unit-test.logs and e2e-tests.log

**HUMAN OVERSIGHT REQUIRED**: 
- Manually review all generated test code before execution
- Verify test logic matches issue description
- Confirm test environment is properly isolated
- REPRODUCTION ATTEMPT IS MANDATORY

## Reproduction Validation
- **✅ Issue Reproduced:** Test failures indicate successful reproduction
- **❌ Issue Not Reproduced:** All tests pass - requires investigation

## Checklist (tick as you proceed)
- [ ] Execute automated test suites (unit, integration, e2e)
- [ ] Confirm issue reproduced in sample app  
- [ ] Validate Auth0 configuration (.env.local, middleware usage)  
- [ ] Locate offending code in SDK based on test failures
- [ ] Draft fix approach  
- [ ] Assess backward compatibility  
- [ ] Enhance test coverage for edge cases
- [ ] Update docs and changelog if necessary

## Your Task
1. Analyse the issue / PR details provided above.  
2. Identify **root cause** and affected components.  
3. Determine **reproduction steps**.
4. Propose a **preliminary fix strategy**.

## Deliverable Format (save to `{{BUGREPORT_FILE}}`)
1. **Summary** – one-sentence description
2. **Root Cause** – technical deep dive based on test analysis
3. **Affected Files** – bullet list with rationales
4. **Test Results Analysis** – detailed breakdown of test failures
5. **Reproduction Confirmation** – test-based evidence
6. **Fix Strategy** – high-level approach
7. **Diagnostics Summary** – key findings from automated checks

**Note:** Test failures are the primary indicator of successful issue reproduction. Passing tests suggest the issue may not be reproducible in the current environment or test scenarios need refinement.