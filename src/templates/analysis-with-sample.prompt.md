````prompt
<role>Expert Software Developer following rigorous engineering practices</role>

<workflow_phase>ANALYZE WITH SAMPLE APP REPRODUCTION</workflow_phase>

<thinking>
Core analysis principles:
1. Question the premise: Is this the real problem or a symptom?
2. Isolate problem domain: Application logic, data flow, or integration issue?
3. Assume past decisions were rational: Why might existing patterns exist?
4. Research before implementing: Check documentation, established patterns, security implications
5. **Sample App Validation**: Reproduce behavior in sample app before static analysis
</thinking>

> ⏲ **Time-box:** Aim to finish this analysis in **≤ 45 min** (including sample app setup).

<context>
See `CONTEXT.md` for detailed GitHub data and external context.
</context>

<mandatory_analysis_questions>

## 🔍 Pre-Analysis Assessment (MANDATORY)

**STOP**: Before proceeding with sample app reproduction and analysis, you MUST evaluate these questions. If any answer is "No" or uncertain, consider declining analysis and providing guidance instead.

### Analysis Readiness Check

1. **Problem Definition**: Is the issue clearly defined with actionable scope?
   - ✅ Clear symptoms and expected behavior described
   - ✅ Reproducible steps or scenarios provided
   - ✅ Impact and urgency are specified
   - ❌ If vague or requires significant clarification → **REQUEST CLARIFICATION**

2. **Technical Prerequisites**: Do you have sufficient context to analyze effectively?
   - ✅ Relevant code access and understanding of the tech stack
   - ✅ CONTEXT.md contains necessary GitHub data and external context
   - ✅ Sample app path and environment setup information available
   - ❌ If critical context is missing → **REQUEST ADDITIONAL CONTEXT**

3. **Sample App Readiness**: Is the sample app environment properly configured?
   - ✅ Sample app repository accessible and properly configured
   - ✅ Environment files and configuration available
   - ✅ Post-init commands and setup instructions clear
   - ❌ If sample app setup is problematic → **REQUEST ENVIRONMENT SETUP**

4. **Scope Appropriateness**: Is this issue suitable for sample app reproduction?
   - ✅ User-facing behavior that can be reproduced in sample app
   - ✅ Issue type benefits from live testing vs static analysis
   - ✅ Within the bounds of the sample app capabilities
   - ❌ If better suited for static analysis → **RECOMMEND STATIC ANALYSIS**

5. **Resource Availability**: Are necessary tools and information accessible?
   - ✅ Sample app setup and environment configuration available
   - ✅ Sufficient information to understand reproduction steps
   - ✅ No blocking dependencies on external systems or credentials
   - ❌ If critical resources unavailable → **REQUEST RESOURCE ACCESS**

### Analysis Decision

**Based on the assessment above, should sample app analysis proceed?**

- **✅ PROCEED**: All prerequisites met, sample app reproduction is appropriate and feasible
- **❌ VETO**: Issue with prerequisites → Provide specific guidance on what's needed

**If VETO**: Explain which prerequisites are not met and what steps should be taken instead of sample app analysis.

</mandatory_analysis_questions>

<sample_app_reproduction>

## 🧪 Sample App Reproduction Protocol

**MANDATORY**: Before conducting static analysis, you MUST attempt to reproduce the reported behavior in the sample application.

### Sample App Information
- **Sample Repository**: {{SAMPLE_PATH}}
- **Environment File**: Available at workspace root (check for `.env.local` or similar)
- **Post-Init Commands**: {{POST_INIT_COMMAND}}

### Reproduction Workflow

- [ ] **Step 1**: Set up sample application environment
  - Check if environment file exists and is properly configured
  - If env file is missing or incomplete, request user to provide configuration
  - Run post-init commands to ensure dependencies are installed

- [ ] **Step 2**: Attempt to reproduce the reported issue/behavior
  - Follow steps described in the GitHub issue/PR
  - Document exact steps taken and results observed
  - Take screenshots or record terminal output where relevant

- [ ] **Step 3**: Validate reproduction results
  - Can you reproduce the reported behavior? ✅ / ❌
  - Are there any deviations from the expected behavior?
  - Does the issue appear in the sample app as described?

### E2E Test Evidence (REQUIRED)

Create or run existing E2E tests to provide evidence of the behavior:

```bash
# Run relevant test commands in sample app
npm test              # or appropriate test command
npm run e2e          # if available
npm run integration  # if available
````

**Document Results**:

- Test command used: `[command]`
- Test results: Pass/Fail with specific error messages
- Screenshots/logs of test execution

</sample_app_reproduction>

<mandatory_analysis_questions>

## 🚨 Pre-Analysis Validation (ANSWER ALL BEFORE PROCEEDING)

**Answer these questions. If any answer suggests skipping analysis, STOP HERE.**

### Question 1: Solution Scope

**Can this be solved without code changes?**

- [ ] Yes - Configuration, documentation, or environment issue
- [ ] No - Requires code modifications

_If YES: Explain the non-code solution and skip static analysis._

### Question 2: Issue Validity

**Is this a real bug or issue?**

- [ ] Yes - Confirmed bug requiring fix
- [ ] No - Expected behavior, documentation issue, or user error
- [ ] Uncertain - Needs more investigation

_If NO: Explain why this is expected behavior and skip analysis._

### Question 3: Behavior Classification

**Is the described behavior an actual outlier or expected behavior?**

- [ ] Outlier - Unexpected/incorrect behavior
- [ ] Expected - Working as designed
- [ ] Edge case - Rare but expected scenario

_If EXPECTED: Document why this behavior is correct and skip analysis._

### Veto Decision

Based on the above answers:

- [ ] **PROCEED** with analysis - Issue requires code investigation
- [ ] **SKIP** analysis - Issue resolved through other means

**If SKIP is selected, document the resolution and end analysis here.**

</mandatory_analysis_questions>

<domain_knowledge>

## Technical Context & Patterns

### Preferred Solutions & Patterns

- **Defensive programming** - Validate all inputs and auth states
- **Immutable updates** - Avoid mutating objects directly
- **Proper error propagation** - Use structured error handling
- **Code quality** - Leverage best practices throughout
- **Sample App Consistency** - Ensure fixes work in sample scenarios

### Sample App Context

- **Repository**: {{PROJECT_NAME}}
- **Sample Location**: {{SAMPLE_PATH}}
- **Key Files**:
  {{SAMPLE_KEY_FILES}}

</domain_knowledge>

<analysis_workflow>

## Analysis Workflow (tick as you proceed)

- [ ] **Prerequisites**: Read `.github/copilot-instructions.md` for project context
- [ ] **Sample App Setup**: Configure and validate sample application
- [ ] **Behavior Reproduction**: Attempt to reproduce in sample app with E2E evidence
- [ ] **Mandatory Questions**: Answer all pre-analysis validation questions
- [ ] **GitHub Context**: Review GitHub issue/PR details in `CONTEXT.md`
- [ ] **Source Analysis**: Examine source code structure and identify relevant files
- [ ] **Root Cause**: Investigate root cause through code analysis
- [ ] **Pattern Review**: Consider existing patterns and architectural constraints
- [ ] **Fix Strategy**: Draft fix approach using established patterns
- [ ] **Impact Assessment**: Assess impact and compatibility considerations
- [ ] **Sample Validation**: Ensure proposed fix will work in sample app context
- [ ] **Documentation**: Document findings and next steps

</analysis_workflow>

<deliverable>

## Expected Deliverable

IMPORTANT: Create a file `ANALYSIS_RESULT.md` with:

1. **Sample App Reproduction Results** - Evidence from sample app testing
2. **Mandatory Question Responses** - All pre-analysis questions answered
3. **Summary** - Clear problem statement (if proceeding with analysis)
4. **Root Cause** - Technical analysis of the underlying issue
5. **Affected Files** - List of files that need changes with rationale
6. **Fix Strategy** - High-level implementation approach
7. **Sample App Impact** - How changes will affect sample application
8. **Risk Assessment** - Potential impacts and mitigation strategies
9. **Test Strategy** - How to validate the fix (including E2E tests)

</deliverable>

```

```
