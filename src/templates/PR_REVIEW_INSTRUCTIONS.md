# PR Review Instructions for {{PROJECT_NAME}}

## Context & Setup

- **Project**: {{PROJECT_NAME}}
- **Issue IDs**: {{ISSUE_IDS}}
- **Branch**: {{BRANCH_NAME}}
- **Repository**: {{REPO_URL}}
- **Sample Repository**: {{SAMPLE_REPO_PATH}}

## Prerequisites

- [ ] **Read Project Context**: Review `.github/copilot-instructions.md` for project architecture and patterns
- [ ] **Understand Changes**: Read the diff and understand the scope of modifications
- [ ] **Review Issue Context**: Check `CONTEXT.md` for background on the problem being solved

## Intent Analysis Framework

### Question Mode (Use when PR author asks specific questions)

- Answer the question directly using available context
- Use regular comments, not formal review system
- Focus on the specific question asked

### Review Mode (Use for comprehensive PR review)

Follow the structured review process below.

## Structured Review Process

### Phase 1: Context Understanding

1. **Read the Diff**

   ```bash
   # Focus on these file patterns (exclude build artifacts)
   git diff --exclude="node_modules/**" \
            --exclude="dist/**" \
            --exclude="build/**" \
            --exclude="coverage/**" \
            --exclude="*.lock" \
            --exclude="*.min.*"
   ```

2. **Project Guidelines**
   - Review `.github/copilot-instructions.md`
   - Check existing patterns in similar files
   - Understand architectural constraints

3. **Issue Context**
   - Read GitHub issue/PR details in `CONTEXT.md`
   - Understand the problem being solved
   - Check acceptance criteria

### Phase 2: Analysis Framework

#### Security Assessment

- [ ] **Authentication/Authorization**: Check for proper access controls
- [ ] **Input Validation**: Verify all user inputs are validated
- [ ] **SQL Injection**: Check database queries for parameterization
- [ ] **XSS Prevention**: Verify output encoding/escaping
- [ ] **CSRF Protection**: Check state-changing operations
- [ ] **Secret Management**: Ensure no hardcoded secrets

#### Code Quality Assessment

- [ ] **Logic Errors**: Check for potential bugs or edge cases
- [ ] **Error Handling**: Verify proper error catching and reporting
- [ ] **Performance**: Look for inefficient operations or memory leaks
- [ ] **Standards Compliance**: Check adherence to project conventions
- [ ] **Test Coverage**: Verify adequate test coverage for changes

#### Architectural Assessment

- [ ] **Pattern Consistency**: Follows established project patterns
- [ ] **Separation of Concerns**: Proper layering and responsibility division
- [ ] **Dependency Management**: Appropriate use of dependencies
- [ ] **API Design**: RESTful principles and consistent interfaces

### Phase 3: Code Suggestions Format

When providing code suggestions, use this EXACT format:

```suggestion
corrected code here
```

**CRITICAL RULES for suggestions:**

- ONLY replace the specific line(s) being commented on
- For single-line comments: Replace ONLY that line
- For multi-line comments: Replace ONLY the lines in the range
- DO NOT include surrounding context or function signatures
- Keep indentation consistent
- Ensure replacement keeps code compiling

### Phase 4: Final Assessment

Use this format for overall review:

```
## Overall Assessment
✅ Ready to merge
❌ Issues need to be addressed

[Specific reasoning based on analysis]
```

## Review Guidelines

**FOCUS ONLY ON ISSUES THAT NEED TO BE ADDRESSED:**

✅ **DO comment on:**

- Security vulnerabilities
- Bugs and logic errors
- Performance issues
- Code quality problems requiring fixes
- Missing error handling or edge cases
- Standards violations that must be corrected

❌ **DO NOT comment on:**

- Praise or positive observations
- Acknowledgments of good practices
- Comments like "Good practice:", "Well done:", "Nice implementation:"
- Anything that doesn't require action

## Sample App Validation

When sample repository is available:

- [ ] **Test Changes**: Verify changes work in sample app context
- [ ] **Environment Setup**: Check that environment configuration is correct
- [ ] **Integration**: Ensure SDK changes integrate properly with sample
- [ ] **User Experience**: Consider impact on developer experience

## Progress Tracking Template

```markdown
### Code Review in Progress 🔄

**Tasks:**

- [ ] Read the diff to understand changes
- [ ] Read project guidelines
- [ ] Analyze implementation changes
- [ ] Review test coverage
- [ ] Submit code review feedback

**Status:** [Current phase]
```

## Quick Reference

### Common File Exclusions

```
:!vendor/**
:!node_modules/**
:!dist/**
:!build/**
:!out/**
:!target/**
:!bin/**
:!coverage/**
:!package-lock.json
:!yarn.lock
:!pnpm-lock.yaml
:!*.min.js
:!*.min.css
:!*.bundle.*
```

### GitHub Review Commands

- Create pending review
- Add inline comments with specific line numbers
- Submit final review with overall assessment
- Use "COMMENT" event type for non-blocking feedback

---

**Remember**: Always read project context first, focus on actionable issues only, and provide specific, constructive feedback that helps improve the code quality.
