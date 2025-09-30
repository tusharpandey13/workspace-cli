# Enhanced Analysis Template with Claude-Inspired Review Patterns

## Context & Setup

- **Project**: {{PROJECT_NAME}}
- **Issue IDs**: {{ISSUE_IDS}}
- **Branch**: {{BRANCH_NAME}}
- **Repository**: {{REPO_URL}}
- **Sample Repository**: {{SAMPLE_REPO_PATH}}

## Pre-Analysis Assessment (MANDATORY - Answer ALL before proceeding)

### 1. Problem Definition Clarity

❓ **Is the problem clearly defined in the GitHub issues/PR?**

- [ ] ✅ Yes, problem is well-documented with reproduction steps
- [ ] ⚠️ Partially, some details are missing
- [ ] ❌ No, problem statement is unclear or missing

**Veto Trigger**: If ❌, STOP and request clarification from issue author.

### 2. Technical Prerequisites

❓ **Do you have the necessary technical context to analyze this problem?**

- [ ] ✅ Yes, familiar with the technology stack and domain
- [ ] ⚠️ Partially, need to research some components
- [ ] ❌ No, significant knowledge gaps exist

**Veto Trigger**: If ❌, STOP and research the technology stack first.

### 3. Scope Appropriateness

❓ **Is the scope appropriate for the allocated time/complexity?**

- [ ] ✅ Yes, scope is reasonable and well-defined
- [ ] ⚠️ Scope is large but manageable with focused approach
- [ ] ❌ No, scope is too broad or undefined

**Veto Trigger**: If ❌, STOP and break down into smaller, focused tasks.

### 4. Context Completeness

❓ **Do you have access to all necessary context (code, docs, related issues)?**

- [ ] ✅ Yes, all necessary context is available
- [ ] ⚠️ Most context available, some gaps can be filled during analysis
- [ ] ❌ No, critical context is missing

**Veto Trigger**: If ❌, STOP and gather missing context first.

### 5. Analysis Value

❓ **Will this analysis provide actionable insights or solutions?**

- [ ] ✅ Yes, analysis can lead to concrete next steps
- [ ] ⚠️ Likely, but outcome may require iteration
- [ ] ❌ No, analysis is premature or lacks clear objectives

**Veto Trigger**: If ❌, STOP and clarify objectives or wait for better timing.

**PROCEED ONLY IF NO VETO TRIGGERS ACTIVATED**

---

## Intent Analysis Framework

### Determine Analysis Mode:

#### Investigation Mode (Problem Understanding)

**Use when**: Understanding an issue, exploring codebase, diagnosing problems
**Focus**: Root cause analysis, pattern identification, context gathering

#### Review Mode (Code Assessment)

**Use when**: Reviewing PRs, evaluating implementations, quality assessment
**Focus**: Security, bugs, performance, standards compliance

#### Implementation Mode (Solution Development)

**Use when**: Designing fixes, architecting solutions, planning changes
**Focus**: Solution design, compatibility, testing strategy

---

## Analysis Workflow (tick as you proceed)

### Phase 1: Context Foundation

- [ ] **Prerequisites**: Read `.github/copilot-instructions.md` for project context
- [ ] **GitHub Context**: Review GitHub issue/PR details in `CONTEXT.md`
- [ ] **Repository Structure**: Understand project layout and key files
- [ ] **Documentation Review**: Read relevant docs for domain understanding

### Phase 2: Smart Diff Analysis (Claude-Inspired)

#### Diff Exclusion Patterns

Focus analysis on meaningful code changes, exclude:

```
:!vendor/**          # Third-party dependencies
:!node_modules/**     # Package dependencies
:!dist/**            # Build output
:!build/**           # Build artifacts
:!out/**             # Output directories
:!target/**          # Java build output
:!bin/**             # Binary files
:!coverage/**        # Test coverage reports
:!package-lock.json  # Lock files
:!yarn.lock
:!pnpm-lock.yaml
:!*.min.js           # Minified files
:!*.min.css
:!*.bundle.*         # Bundle files
```

#### Analysis Tasks

- [ ] **Change Scope**: Identify all modified files and their relationships
- [ ] **Logic Changes**: Focus on business logic and algorithmic changes
- [ ] **API Changes**: Document interface modifications and breaking changes
- [ ] **Configuration Changes**: Review config and environment changes

### Phase 3: Security & Quality Assessment

#### Security Checklist (Claude's Standards)

- [ ] **Input Validation**: All user inputs properly validated
- [ ] **SQL Injection**: Database queries use parameterization
- [ ] **XSS Prevention**: Output properly encoded/escaped
- [ ] **Authentication**: Access controls properly implemented
- [ ] **Authorization**: Permission checks in place
- [ ] **Secret Management**: No hardcoded credentials or tokens
- [ ] **CSRF Protection**: State-changing operations protected

#### Code Quality Checklist

- [ ] **Logic Errors**: Check for bugs and edge cases
- [ ] **Error Handling**: Proper exception handling and recovery
- [ ] **Performance**: Identify inefficient operations
- [ ] **Memory Management**: Check for leaks or excessive usage
- [ ] **Standards Compliance**: Follows project conventions
- [ ] **Test Coverage**: Adequate testing for changes

### Phase 4: Sample App Integration (When Available)

- [ ] **Environment Setup**: Configure sample app environment
- [ ] **Integration Testing**: Test changes in sample context
- [ ] **User Experience**: Evaluate developer experience impact
- [ ] **Documentation**: Verify sample app docs reflect changes

### Phase 5: Root Cause & Solution Analysis

#### Problem Analysis

- [ ] **Root Cause Identification**: Dig deeper than surface symptoms
- [ ] **Impact Assessment**: Understand full scope of the issue
- [ ] **Pattern Analysis**: Look for similar issues in codebase
- [ ] **Architectural Review**: Consider structural problems

#### Solution Evaluation

- [ ] **Fix Strategy**: Evaluate proposed or potential solutions
- [ ] **Compatibility**: Check backward/forward compatibility
- [ ] **Testing Strategy**: Plan for validation and edge cases
- [ ] **Rollback Plan**: Consider failure scenarios and recovery

### Phase 6: Final Assessment & Recommendations

#### Progress Tracking Template

```markdown
### Analysis Progress 🔄

**Current Phase**: [Phase name]

**Completed:**

- [x] Context gathering
- [x] Code analysis
- [ ] Solution design
- [ ] Testing validation

**Status**: [Current findings]
```

#### Assessment Framework (Claude-Style)

```
## Overall Assessment
✅ Ready for implementation
⚠️  Needs additional work
❌ Significant issues identified

**Key Findings:**
- [Specific observations]
- [Security/quality concerns]
- [Recommended next steps]
```

---

## Quality Gates

### Before Proceeding to Implementation:

- [ ] Security review completed with no critical issues
- [ ] Performance impact assessed and acceptable
- [ ] Breaking changes documented and justified
- [ ] Test strategy defined and sufficient
- [ ] Architectural alignment confirmed

### Before Recommending Merge:

- [ ] All identified issues addressed
- [ ] Code follows project standards
- [ ] Test coverage adequate
- [ ] Documentation updated
- [ ] Sample app integration verified (if applicable)

---

## Documentation Standards

### Required Deliverables:

1. **Analysis Summary**: Clear problem statement and findings
2. **Security Assessment**: Security review with specific findings
3. **Implementation Recommendations**: Actionable next steps
4. **Test Strategy**: How to validate the solution
5. **Risk Assessment**: Potential issues and mitigation strategies

### Documentation Format:

- Use clear, concise language
- Provide specific examples and evidence
- Include code snippets when relevant
- Reference line numbers and file paths
- Link to related issues and documentation

---

**Remember**: This enhanced template incorporates Claude's systematic approach to code review with intent analysis, security focus, and structured assessment patterns.
