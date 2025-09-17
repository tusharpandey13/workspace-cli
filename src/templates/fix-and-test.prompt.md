<role>Expert Software Developer implementing fixes and validation</role>

<workflow_phase>IMPLEMENT + VALIDATE</workflow_phase>

<thinking>
Implementation and testing principles:
1. IMPLEMENT: Small, testable increments following existing patterns
2. VALIDATE: Test behaviors, not implementation details
3. Mock at system boundaries rather than internal functions
4. Test failure modes and edge cases proactively
5. Integration testing before isolated unit testing
</thinking>

> ⏲ **Time-box:** Target **≤ 90 min** for implementation and initial testing.

## Implementation Strategy

### 1. Review Analysis

Consult `CONTEXT.md` and `ANALYSIS_RESULT.md` for the analysis summary and proposed approach. Ensure you understand:

- **Root cause**: What is the core issue to be addressed?
- **Scope**: Which files and components need changes?
- **Dependencies**: What other systems or components are affected?
- **Edge cases**: What failure modes need to be handled?

### 2. Implementation Plan

IMPORTANT: Create `IMPLEMENTATION_PLAN.md` with a strict ROI-prioritized approach and follow it. Update this file as you make progress.

- **Small increments**: Make changes in testable, reviewable chunks
- **Existing patterns**: Follow established codebase conventions
- **Error handling**: Include proper error handling and edge cases
- **Documentation**: Update relevant documentation and comments

### 3. Testing Strategy

<testing_domain_knowledge>

## Testing Context & Standards

### Testing Anti-Patterns to Avoid

- **❌ Testing implementation details** instead of behavior
- **❌ Flaky time-dependent tests** without proper mocking
- **❌ Over-mocking** that makes tests meaningless
- **❌ Missing edge case coverage** (null, undefined, error states)
- **❌ Inconsistent test data** across different test files

### Preferred Testing Approaches

- **✅ HTTP-layer mocking** over unit stubbing
- **✅ Arrange-Act-Assert** pattern for clarity
- **✅ Descriptive test names** that explain the scenario
- **✅ Setup/teardown** for consistent test environments
- **✅ Error scenario testing** with expected failure modes

## Test Requirements

- **Extend existing test files** rather than creating new test infrastructure from scratch
- **Use pre-configured testing tools** for mocking and fixtures (check project configuration)
- **Follow existing patterns** - Mirror test structure and naming conventions already in place
- **Cover success & failure scenarios** - Add both happy paths and error conditions to existing test suites
- **Use existing test scripts** - Run tests via available project commands and build systems
- **Deterministic execution** - Leverage existing configuration for reliable test execution
  </testing_domain_knowledge>

Test at appropriate levels:

- **Unit testing**: Focus on critical business logic and edge cases
- **Integration testing**: Verify component interactions
- **End-to-end testing**: Validate complete user flows where applicable
- **Error scenario testing**: Test failure modes and recovery

## Implementation Workflow

### Phase A: IMPLEMENT

1. **Code Changes**:

   ```bash
   cd {{SOURCE_PATH}}
   # Follow the implementation plan from analysis
   # Make changes in small, logical commits
   ```

2. **Testing Infrastructure**:
   - Examine existing test structure and patterns
   - Extend existing test files rather than creating new infrastructure
   - Use project's established testing tools and conventions

3. **Quality Checks**:
   - Ensure code follows existing style and patterns
   - Add/update documentation as needed
   - Verify no breaking changes to public APIs

### Phase B: VALIDATE

1. **Run Existing Tests**:

   ```bash
   cd {{SOURCE_PATH}}
   # Use project-specific test commands:
   {{POST_INIT_COMMAND}}
   # Or check build files for appropriate test command
   ```

2. **Add New Tests**:
   - Test the specific fix/feature implemented
   - Cover edge cases and error scenarios
   - Verify integration with existing components

3. **Manual Verification**:
   - Test the fix in realistic scenarios
   - Verify the original issue is resolved
   - Check for any unintended side effects

## Success Criteria

### Implementation Complete When:

- [ ] All planned code changes implemented following existing patterns
- [ ] No breaking changes to existing APIs
- [ ] Code follows project style guidelines
- [ ] Proper error handling included
- [ ] Relevant documentation updated

### Testing Complete When:

- [ ] All existing tests pass
- [ ] New tests cover the implemented functionality
- [ ] Edge cases and error scenarios tested
- [ ] Manual verification confirms fix works
- [ ] No performance regressions introduced

<handoff>
## Handoff to Next Phase
<implementation_complete>
<code_changes>{{CODE_CHANGES}}</code_changes>
<tests_added>{{TESTS_ADDED}}</tests_added>
<tests_passing>{{TESTS_PASSING}}</tests_passing>
<manual_verification>{{MANUAL_VERIFICATION}}</manual_verification>
<performance_impact>{{PERFORMANCE_IMPACT}}</performance_impact>
</implementation_complete>

**Next recommended prompt:**

- If implementation needs refinement: Continue with `fix-and-test.prompt.md`
- If ready for review: `review-changes.prompt.md`
- If issues discovered: `analysis.prompt.md` (re-analyze)
  </handoff>
