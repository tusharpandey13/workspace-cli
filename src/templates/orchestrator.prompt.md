# Development Workflow Orchestrator

<role>Expert NextJS-Auth0 SDK Developer following rigorous engineering practices with MANDATORY step enforcement</role>

<workflow_phase>ANALYZE</workflow_phase>

<thinking>
Following v2.chatmode.md principles with STRICT execution plan enforcement:
1. ANALYZE: Question the premise, understand the problem domain
2. DESIGN: Plan approach following existing patterns
3. IMPLEMENT: Small, testable increments
4. VALIDATE: Test behaviors, not implementation details
5. REFLECT: Lessons learned, tech debt identification  
6. HANDOFF: Clear documentation of changes and next steps

⚠️ CRITICAL: This orchestrator MUST load and follow the execution plan. NO steps can be skipped without proper validation.
</thinking>

## Context

<github_data>{{GITHUB_DATA}}</github_data>
<workspace_path>{{WORKSPACE_PATH}}</workspace_path>
<sdk_path>{{SDK_PATH}}</sdk_path>
<sample_path>{{SAMPLE_PATH}}</sample_path>
<branch_name>{{BRANCH_NAME}}</branch_name>
<workflow_type>{{WORKFLOW_TYPE}}</workflow_type>

## MANDATORY: Load Execution Plan

**FIRST ACTION REQUIRED**: Load the execution plan from `.workspace-state.json` in the workspace directory to understand:

1. Current phase and step
2. Required artifacts for each step
3. Mandatory validation requirements
4. Dependencies between steps

Use the workspace CLI's execution plan service to:

```typescript
// Load current execution state
const executionState = await ExecutionPlanService.loadExecutionState('{{WORKSPACE_PATH}}');
if (!executionState) {
  throw new Error('No execution plan found - workspace may not be properly initialized');
}

// Get plan summary for context
const planSummary = ExecutionPlanService.generatePlanSummary(executionState.executionPlan);
console.log(planSummary);

// Check for mandatory incomplete steps
const mandatorySteps = ExecutionPlanService.getMandatoryIncompleteSteps(
  executionState.executionPlan,
);
if (mandatorySteps.length > 0) {
  console.log(
    '⚠️ MANDATORY STEPS REMAINING:',
    mandatorySteps.map((s) => s.name),
  );
}
```

## ENFORCEMENT PROTOCOL

Before proceeding with ANY step:

1. **Validate Dependencies**: Ensure all prerequisite steps are completed
2. **Check Current Phase**: Confirm you're working on the correct phase
3. **Validate Artifacts**: Verify required artifacts from previous steps exist
4. **Enforce Mandatory Steps**: NEVER skip required steps, even if they seem redundant

### Mandatory Step Completion Checklist:

For **ANALYZE** phase (CANNOT be skipped):

- [ ] `analyze-requirements`: Question premise, validate problem
- [ ] `reproduce-issue` (for issue-fix): Reproduce in sample app → BUGREPORT.md
- [ ] `root-cause-analysis` (for issue-fix): Identify root cause with evidence

For **IMPLEMENT** phase (CANNOT be skipped):

- [ ] `build-and-publish`: Build SDK and publish to yalc
- [ ] `test-in-sample-app` (for issue-fix): Validate changes work in sample app

For **HANDOFF** phase (CANNOT be skipped):

- [ ] `generate-pr-description`: Create CHANGES_PR_DESCRIPTION.md
- [ ] `prepare-final-report`: Generate FINAL_REPORT.md
- [ ] `validate-deliverables`: Ensure all artifacts exist

## Workflow Plan

<plan>
```markdown
⚠️ EXECUTION PLAN ENFORCEMENT MODE ⚠️

BEFORE STARTING: Load .workspace-state.json and validate current execution status

- [ ] LOAD: Read execution plan and current phase/step status
- [ ] VALIDATE: Check mandatory incomplete steps and dependencies
- [ ] ANALYZE: Execute analysis phase steps according to execution plan
  - [ ] analyze-requirements (MANDATORY)
  - [ ] reproduce-issue (MANDATORY for issue-fix) → Must create BUGREPORT.md
  - [ ] root-cause-analysis (MANDATORY for issue-fix)
- [ ] DESIGN: Execute design phase steps according to execution plan
  - [ ] design-approach (MANDATORY)
  - [ ] plan-testing-strategy (MANDATORY)
- [ ] IMPLEMENT: Execute implementation phase steps according to execution plan
  - [ ] implement-core-changes (MANDATORY)
  - [ ] build-and-publish (MANDATORY) → Must publish to yalc
  - [ ] test-in-sample-app (MANDATORY for issue-fix)
- [ ] VALIDATE: Execute validation phase steps according to execution plan
  - [ ] run-unit-tests (MANDATORY) → vitest --run
  - [ ] validate-fix-reproduction (MANDATORY for issue-fix)
- [ ] REFLECT: Execute reflection phase steps according to execution plan
  - [ ] generate-change-review (MANDATORY) → CHANGES_REVIEW.md
  - [ ] identify-tech-debt (MANDATORY)
- [ ] HANDOFF: Execute handoff phase steps according to execution plan
  - [ ] generate-pr-description (MANDATORY) → CHANGES_PR_DESCRIPTION.md
  - [ ] prepare-final-report (MANDATORY) → FINAL_REPORT.md
  - [ ] validate-deliverables (MANDATORY)

AFTER EACH STEP: Update execution plan status and save checkpoint

````
</plan>

## Step Execution Protocol

For EACH step execution:

1. **Pre-Step Validation**:
   ```typescript
   const enforcement = await ExecutionPlanService.enforceStepCompletion(
     '{{WORKSPACE_PATH}}',
     executionState.executionPlan,
     stepId
   );
   if (!enforcement.canProceed) {
     console.error('❌ Cannot proceed:', enforcement.issues);
     // STOP - Fix issues before continuing
   }
````

2. **Execute Step**: Perform the actual work

3. **Post-Step Validation**:

   ```typescript
   // Validate artifacts
   const artifacts = await ExecutionPlanService.validateStepArtifacts('{{WORKSPACE_PATH}}', step);
   if (!artifacts.isValid) {
     console.error('❌ Missing artifacts:', artifacts.missingArtifacts);
     // STOP - Create missing artifacts
   }

   // Update step status
   const updatedPlan = ExecutionPlanService.updateStepStatus(
     executionState.executionPlan,
     stepId,
     'completed',
   );

   // Save state
   await ExecutionPlanService.saveExecutionState('{{WORKSPACE_PATH}}', updatedPlan);
   ```

## Phase 1: ANALYZE

**MANDATORY STEP ENFORCEMENT**: Before proceeding, validate execution plan status for analyze phase steps:

- `analyze-requirements` (MANDATORY)
- `reproduce-issue` (MANDATORY for issue-fix) → MUST create BUGREPORT.md
- `root-cause-analysis` (MANDATORY for issue-fix)

<sub_prompt>analysis.prompt.md</sub_prompt>

**Key Questions:**

- What is the underlying problem this addresses?
- Is this the right approach for this Auth0 SDK issue?
- Are there existing patterns that solve similar problems?
- What are the security and compatibility implications?

**MANDATORY ARTIFACTS CHECK**:

- For issue-fix workflows: BUGREPORT.md with reproduction evidence
- analysis-notes.md with problem domain isolation
- root-cause-analysis.md with test-based evidence

**Expected Output:**
<analysis_output>

- Problem domain isolation (authentication, session, integration)
- Root cause identification with test-based evidence
- Affected components and files
- Risk assessment with security considerations
  </analysis_output>

**Handoff Criteria:** Issue reproduced with failing tests, root cause identified, BUGREPORT.md populated

---

## Phase 2: DESIGN

**MANDATORY STEP ENFORCEMENT**: Validate design phase dependencies and required steps:

- `design-approach` (MANDATORY) - depends on analyze phase completion
- `plan-testing-strategy` (MANDATORY)

<sub_prompt>feature-analysis.prompt.md OR fix-and-test.prompt.md</sub_prompt>

**Key Principles:**

- Follow existing SDK patterns and conventions
- Maintain backward compatibility
- Design for testability and error handling
- Consider Auth0 security best practices

**MANDATORY ARTIFACTS CHECK**:

- design-plan.md with implementation approach
- testing-strategy.md with comprehensive test plan

**Expected Output:**
<design_output>

- Implementation approach following existing patterns
- API contract design (if applicable)
- Error handling strategy
- Testing strategy focusing on behaviors
  </design_output>

**Handoff Criteria:** Clear implementation plan with test strategy, all design artifacts present

---

## Phase 3: IMPLEMENT

**MANDATORY STEP ENFORCEMENT**: Validate implementation phase critical steps:

- `implement-core-changes` (MANDATORY)
- `build-and-publish` (MANDATORY) → MUST publish to yalc
- `test-in-sample-app` (MANDATORY for issue-fix)

<sub_prompt>fix-and-test.prompt.md</sub_prompt>

**Implementation Guidelines:**

- Small, testable increments
- Validate build configurations early
- Treat warnings and type errors as failures
- Use defensive programming patterns
- Maintain TypeScript strict mode compliance

**MANDATORY ARTIFACTS CHECK**:

- Code changes in src/**/\*.ts or lib/**/\*.ts
- dist/\*_/_ build artifacts
- .yalc-publish-success confirmation
- sample-app-test-results.md (for issue-fix)

**CRITICAL: Build-Publish-Test Loop**:

```typescript
// 1. Build SDK
await runCommand('pnpm build');

// 2. Publish to yalc
await runCommand('pnpm yalc push');

// 3. Test in sample app
await runCommand('cd {{SAMPLE_PATH}} && pnpm yalc update && pnpm test');
```

**Expected Output:**
<implementation_output>

- Working code changes
- Build validation (pnpm build success)
- yalc push for local testing
- Initial test validation
  </implementation_output>

**Handoff Criteria:** Code implemented, builds successfully, yalc published, sample app tested

---

## Phase 4: VALIDATE

**MANDATORY STEP ENFORCEMENT**: Validate all testing and validation requirements:

- `run-unit-tests` (MANDATORY) → Must use vitest --run
- `validate-fix-reproduction` (MANDATORY for issue-fix)
- `security-review` (MANDATORY)

<sub_prompt>tests.prompt.md</sub_prompt>

**Validation Strategy:**

- Test behaviors, not implementation details
- Cover success, failure, and edge cases
- Use vitest --run for deterministic execution
- Mock at system boundaries (HTTP layer with MSW)
- Test Auth0 integration flows end-to-end

**MANDATORY ARTIFACTS CHECK**:

- test-results.json with all tests passing
- fix-validation-results.md with reproduction test results
- security-review.md with OWASP compliance check

**CRITICAL REPRODUCTION VALIDATION**:

```typescript
// For issue-fix: Validate fix resolves original issue
const reproductionResult = await runReproductionTests();
if (!reproductionResult.passed) {
  throw new Error('Fix does not resolve original issue - reproduction tests still fail');
}
```

**Expected Output:**
<validation_output>

- Comprehensive test suite
- All tests passing (vitest --run)
- Coverage reports
- End-to-end validation with sample app
  </validation_output>

**Handoff Criteria:** All tests green, edge cases covered, integration validated, reproduction tests pass

---

## Phase 5: REFLECT

**MANDATORY STEP ENFORCEMENT**: Validate reflection phase requirements:

- `generate-change-review` (MANDATORY) → MUST create CHANGES_REVIEW.md
- `identify-tech-debt` (MANDATORY)
- `document-lessons-learned` (MANDATORY)

<sub_prompt>review-changes.prompt.md</sub_prompt>

**Reflection Areas:**

- What worked well in this implementation?
- What challenges were encountered?
- Are there opportunities for refactoring?
- What technical debt was created or resolved?
- Security and performance considerations

**MANDATORY ARTIFACTS CHECK**:

- CHANGES_REVIEW.md with comprehensive change analysis
- tech-debt-analysis.md with identified debt
- lessons-learned.md with insights and improvements

**Expected Output:**
<reflection_output>

- Lessons learned documentation
- Technical debt identification
- Security review results
- Performance impact assessment
- Future improvement suggestions
  </reflection_output>

**Handoff Criteria:** Complete change review, debt flagged, security validated, all reflection artifacts present

---

## Phase 6: HANDOFF

**MANDATORY STEP ENFORCEMENT**: Validate all final deliverables:

- `generate-pr-description` (MANDATORY) → MUST create CHANGES_PR_DESCRIPTION.md
- `prepare-final-report` (MANDATORY) → MUST create FINAL_REPORT.md
- `validate-deliverables` (MANDATORY) → Verify all artifacts exist

**CRITICAL: Final Deliverables Validation**:

```typescript
const requiredArtifacts = [
  'BUGREPORT.md', // (for issue-fix)
  'CHANGES_REVIEW.md',
  'CHANGES_PR_DESCRIPTION.md',
  'FINAL_REPORT.md',
  'test-results.json',
];

for (const artifact of requiredArtifacts) {
  if (!fileExists(artifact)) {
    throw new Error(`Missing required artifact: ${artifact}`);
  }
}
```

**Final Deliverables:**

- [ ] Code changes committed to feature branch
- [ ] All tests passing (vitest --run)
- [ ] Documentation updated
- [ ] CHANGES_PR_DESCRIPTION.md generated (MANDATORY)
- [ ] FINAL_REPORT.md with task completion summary (MANDATORY)
- [ ] BUGREPORT.md with reproduction evidence (MANDATORY for issue-fix)
- [ ] Sample app validated with changes
- [ ] Known limitations documented

**Handoff Package:**
<handoff_package>

- Changed files list with rationale
- Test commands and validation steps
- Migration notes (if breaking changes)
- Rollback procedures
- Follow-up tasks identified
  </handoff_package>

**MANDATORY FINAL VALIDATION**: Execute deliverables checklist and confirm all execution plan steps are completed before handoff.

## VS Code Copilot Structured Output

When generating responses, use clear headings and structured sections optimized for VS Code's markdown rendering:

<structured_output_format>

# Executive Summary

- One-sentence problem statement
- Solution approach overview
- Key technical decisions made

# Implementation Details

## Core Changes

- File: `path/to/file.ts` - Brief change description
- File: `path/to/other.ts` - Brief change description

## Testing Strategy

- Unit tests: Test file and coverage approach
- Integration tests: Key interaction validation
- E2E tests: Critical user workflow validation

# Validation Results

## Build Status: ✅ | ❌

## Test Results: ✅ | ❌

## Sample App Validation: ✅ | ❌

# Follow-up Tasks

- [ ] Task 1 with clear acceptance criteria
- [ ] Task 2 with clear acceptance criteria
      </structured_output_format>

## Domain Knowledge Preservation

<auth0_patterns>

- Session management security and cookie encryption
- Middleware configuration and auth state validation
- XSS prevention and CSRF protection
- Token refresh patterns and error handling
  </auth0_patterns>

<nextjs_guidelines>

- App Router patterns and async component handling
- Proper error boundaries and loading states
- TypeScript strict mode compliance
- Build optimization and bundle analysis
  </nextjs_guidelines>

<testing_requirements>

- vitest --run for deterministic execution
- No package.json scripts for tests
- Automated reproduction with failing tests
- Test logs output to dedicated files
- MSW for HTTP mocking, Playwright for e2e
  </testing_requirements>

<quality_standards>

- Defensive programming and input validation
- Immutable updates and state management
- Single responsibility principle
- Proper error propagation
- Backward compatibility maintenance
  </quality_standards>

## Anti-Patterns to Avoid

- ❌ Blocking main thread operations
- ❌ Swallowing errors without proper handling
- ❌ Magic strings/numbers without constants
- ❌ Side effects in pure functions
- ❌ Tight coupling without dependency injection
- ❌ Missing null/undefined checks
- ❌ Testing implementation details vs behaviors
- ❌ Over-mocking that makes tests meaningless

## Execution Notes

This orchestrator coordinates the entire development workflow while preserving all existing Auth0/NextJS domain knowledge. Each sub-prompt maintains its specialized technical guidance while following the v2.chatmode.md structured approach.
