# Prompt Chaining Workflows with v2.chatmode.md Guidelines

This document defines simplified prompt chaining workflows following v2.chatmode.md principles for GitHub Copilot.

## Standard 6-Phase Workflow Structure

All prompts follow the v2.chatmode.md 6-phase loop with visible output for each phase:

### ANALYZE → DESIGN → IMPLEMENT → VALIDATE → REFLECT → HANDOFF

## Workflow Orchestration

### Issue-Fix Workflow

```
orchestrator.prompt.md (ANALYZE)
  ↓
analysis.prompt.md (ANALYZE + initial DESIGN)
  ↓
fix-and-test.prompt.md (IMPLEMENT + initial VALIDATE)
  ↓
tests.prompt.md (extended VALIDATE)
  ↓
review-changes.prompt.md (REFLECT + HANDOFF)
```

### Feature Development Workflow

```
orchestrator.prompt.md (ANALYZE)
  ↓
# Prompt Chaining Workflows with v2.chatmode.md Guidelines

This document defines simplified prompt chaining workflows following v2.chatmode.md principles for GitHub Copilot.

## Standard 6-Phase Workflow Structure

All prompts follow the v2.chatmode.md 6-phase loop with visible output for each phase:

### ANALYZE → DESIGN → IMPLEMENT → VALIDATE → REFLECT → HANDOFF

## Workflow Orchestration

### Issue-Fix Workflow
```

orchestrator.prompt.md (ANALYZE)
↓
analysis.prompt.md (ANALYZE + initial DESIGN)
↓
fix-and-test.prompt.md (IMPLEMENT + initial VALIDATE)
↓
tests.prompt.md (extended VALIDATE)
↓
review-changes.prompt.md (REFLECT + HANDOFF)

```

### Feature Development Workflow
```

orchestrator.prompt.md (ANALYZE)
↓
feature-analysis.prompt.md (ANALYZE + DESIGN)
↓
fix-and-test.prompt.md (IMPLEMENT + initial VALIDATE)
↓
tests.prompt.md (extended VALIDATE)
↓
review-changes.prompt.md (REFLECT + HANDOFF)

```

### Maintenance Workflow
```

orchestrator.prompt.md (ANALYZE)
↓
maintenance-analysis.prompt.md (ANALYZE + DESIGN)
↓
fix-and-test.prompt.md (IMPLEMENT + initial VALIDATE)
↓
tests.prompt.md (extended VALIDATE)
↓
review-changes.prompt.md (REFLECT + HANDOFF)

```

### Exploration Workflow
```

orchestrator.prompt.md (ANALYZE)
↓
exploration-analysis.prompt.md (ANALYZE + discovery DESIGN)
↓
universal-analysis.prompt.md (comprehensive ANALYZE)
↓
[Optional: implementation prompts based on findings]

````

## XML Handoff Protocol

Each prompt should emit structured XML for the next phase:

```xml
<handoff>
<phase_complete>ANALYZE|DESIGN|IMPLEMENT|VALIDATE|REFLECT</phase_complete>
<status>{{STATUS}}</status>
<key_findings>{{FINDINGS}}</key_findings>
<next_recommended_prompt>{{PROMPT_NAME}}</next_recommended_prompt>
<context_for_next_phase>{{CONTEXT}}</context_for_next_phase>
</handoff>
````

## Phase-Specific Guidelines

### ANALYZE Phase

- Question the premise: Is this the real problem?
- Isolate the problem domain
- Research external dependencies
- Map files/areas to inspect
- List edge cases and failure modes

### DESIGN Phase

- Follow existing codebase patterns
- Plan data/control flows
- Design error handling strategy
- Plan testing approach focusing on behaviors

### IMPLEMENT Phase

- Small, testable increments following the PLAN
- Validate build configurations early
- Treat warnings and type errors as failures
- Test integration before proceeding

### VALIDATE Phase

- Test behaviors, not implementation details
- Cover failure modes and edge cases
- Run vitest with --run parameter
- Validate security/performance impacts

### REFLECT Phase

- What worked, what to improve
- Identify technical debt
- Document lessons learned
- Plan refactoring opportunities

### HANDOFF Phase

- Document what changed
- Provide runbook with exact commands
- Explain rollback procedures
- List known compromises and follow-up tasks
