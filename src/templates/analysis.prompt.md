# 🔍 Issue & PR Analysis for GitHub IDs: {{GITHUB_IDS}}

<role>Expert Software Developer following rigorous engineering practices</role>

<workflow_phase>ANALYZE</workflow_phase>

<thinking>
Following v2.chatmode.md principles:
1. Question the premise: Is this the real problem or a symptom?
2. Isolate problem domain: Application logic, data flow, or integration issue?
3. Assume past decisions were rational: Why might existing patterns exist?
4. Research before implementing: Check documentation, established patterns, security implications
</thinking>

> ⏲ **Time-box:** Aim to finish this analysis in **≤ 30 min**.

<context>
<github_data>{{GITHUB_DATA}}</github_data>
<related_issues>{{RELATED_ISSUES_PRS}}</related_issues>
<additional_context>{{ADDITIONAL_CONTEXT}}</additional_context>
<workspace>
<source_path>{{SOURCE_PATH}}</source_path>
<destination_path>{{DESTINATION_PATH}}</destination_path>
<branch>{{BRANCH_NAME}}</branch>
</workspace>
</context>

## Workspace Overview

<workspace_structure>
| Area | Path |
|------|------|
| Source Worktree | `{{SOURCE_PATH}}` (branch `{{BRANCH_NAME}}`) |
| Project Files | `{{DESTINATION_PATH}}` |

### Key source files

{{SOURCE_KEY_FILES}}

### Key project files

{{SAMPLE_KEY_FILES}}
</workspace_structure>

<domain_knowledge>

## Technical Context & Patterns

### Preferred Solutions & Patterns

- **Defensive programming** - Validate all inputs and auth states
- **Immutable updates** - Avoid mutating objects directly
- **Proper error propagation** - Use structured error handling
- **Code quality** - Leverage best practices throughout
  </domain_knowledge>

<reproduction_strategy>

## Pre-Configured Testing Infrastructure Available

✅ **Testing infrastructure already set up** at `{{SAMPLE_PATH}}`:

- Vitest configuration: `{{SAMPLE_PATH}}/vitest.config.ts`
- Test scaffolding: `{{SAMPLE_PATH}}/tests/`
- MSW mocking setup: `{{SAMPLE_PATH}}/tests/mocks/`
- Reporting: `{{SAMPLE_PATH}}/test-results/`, `{{SAMPLE_PATH}}/coverage/`
- Package scripts: Check `package.json` for available test scripts

## First Step: Verify Testing Infrastructure

```bash
cd {{SAMPLE_PATH}}
# Run available tests for the project
./run-tests                 # Verify existing tests pass
# Or check project configuration for appropriate test scripts
```

## Issue Reproduction Strategy

**Extend existing test scaffolding** rather than creating from scratch:

1. Navigate to `{{SAMPLE_PATH}}/tests/` directory
2. Examine existing test files and patterns
3. Add new test cases to reproduce the specific issue
4. Use pre-configured MSW handlers for API mocking if available
5. Run tests with `--run` flag to avoid interactive mode
6. Capture failures in existing reporting infrastructure

**CRITICAL**: Use existing testing infrastructure - do NOT set up new vitest/playwright configurations

**HUMAN OVERSIGHT REQUIRED**:

- Verify pre-configured infrastructure is working (check available test scripts)
- Review generated test code before execution
- Confirm test logic matches issue description
- Use existing test patterns and file organization

## Reproduction Validation

- **✅ Issue Reproduced:** Test failures indicate successful reproduction
- **❌ Issue Not Reproduced:** All tests pass - investigate if test scenarios cover the issue
- **🔧 Infrastructure Issues:** If base tests fail, check sample app setup before proceeding
  </reproduction_strategy>

<analysis_workflow>

## Checklist (tick as you proceed)

- [ ] **Verify testing infrastructure works** (`cd {{DESTINATION_PATH}} && ./run-tests` or check available test scripts)
- [ ] **Extend existing test files** to reproduce the issue
- [ ] Confirm issue reproduced through test failures
- [ ] Validate application configuration (.env, config files)
- [ ] Locate problematic code in source based on test failures
- [ ] Draft fix approach using established patterns
- [ ] Assess backward compatibility impact
- [ ] Identify additional test coverage needs
- [ ] Update docs and changelog if necessary

## Your Task

1. **START WITH SAMPLE APP TESTING** - verify pre-configured infrastructure works
2. Analyse the issue / PR details provided above
3. **Use existing test scaffolding** to reproduce the issue
4. Identify **root cause** based on test failures and affected components
5. Propose a **preliminary fix strategy** following established patterns
   </analysis_workflow>

<deliverable>
## Deliverable Format (save to `{{BUGREPORT_FILE}}`)
1. **Summary** – one-sentence description
2. **Root Cause** – technical deep dive based on test analysis
3. **Affected Files** – bullet list with rationales
4. **Test Results Analysis** – detailed breakdown of test failures
5. **Reproduction Confirmation** – test-based evidence
6. **Fix Strategy** – high-level approach
7. **Diagnostics Summary** – key findings from automated checks

**Note:** Test failures are the primary indicator of successful issue reproduction. Passing tests suggest the issue may not be reproducible in the current environment or test scenarios need refinement.
</deliverable>

<handoff>
## Handoff to Next Phase
<analysis_complete>
<reproduction_status>{{REPRODUCTION_STATUS}}</reproduction_status>
<root_cause>{{ROOT_CAUSE}}</root_cause>
<affected_files>{{AFFECTED_FILES}}</affected_files>
<fix_strategy>{{FIX_STRATEGY}}</fix_strategy>
<test_failures>{{TEST_FAILURES}}</test_failures>
</analysis_complete>

**Next recommended prompt:**

- If issue reproduced: `fix-and-test.prompt.md`
- If issue not reproduced: `exploration-analysis.prompt.md`
- If maintenance task: `maintenance-analysis.prompt.md`
  </handoff>
