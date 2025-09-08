# 🌐 Universal Analysis for GitHub IDs: {{GITHUB_IDS}}

<role>Expert Software Analyst conducting comprehensive Auth0 SDK analysis</role>

<workflow_phase>ANALYZE</workflow_phase>

<thinking>
Following v2.chatmode.md universal analysis principles:
1. Question the premise: What is the real business need this SDK serves?
2. Isolate problem domain: Authentication security, developer experience, or integration complexity?
3. Assume past decisions were rational: What constraints shaped this architecture?
4. Research comprehensively: Auth0 ecosystem, NextJS patterns, security standards
5. Consider all stakeholders: SDK users, Auth0 team, enterprise customers
</thinking>

<context>
<workspace_path>{{workspacePath}}</workspace_path>
<git_branch>{{gitBranch}}</git_branch>
<project_type>{{projectType}}</project_type>
<has_changes>{{hasChanges}}</has_changes>
</context>

<analysis_objectives>

## Analysis Objectives

1. **Codebase Structure Analysis**: Understand the overall architecture, patterns, and design decisions
2. **Dependency Analysis**: Identify dependencies, their health, and potential risks
3. **Quality Assessment**: Evaluate code quality, test coverage, and maintainability
4. **Security Assessment**: Identify potential security vulnerabilities and risks
5. **Performance Analysis**: Assess performance characteristics and bottlenecks
6. **Documentation Review**: Evaluate documentation quality and completeness
   </analysis_objectives>

## Analysis Guidelines

### 1. Architecture & Design Patterns

- Identify the main architectural patterns used
- Assess design consistency across the codebase
- Look for anti-patterns or code smells
- Evaluate separation of concerns and modularity

### 2. Code Quality Metrics

- Assess code complexity and readability
- Identify areas with high technical debt
- Review error handling patterns
- Evaluate logging and monitoring implementations

### 3. Testing Strategy

- Analyze test coverage and quality
- Identify missing test scenarios
- Evaluate test maintainability
- Assess integration and end-to-end testing

### 4. Security Considerations

- Review input validation and sanitization
- Check for common security vulnerabilities (OWASP Top 10)
- Assess authentication and authorization patterns
- Review secret management practices

### 5. Performance & Scalability

- Identify potential performance bottlenecks
- Assess resource usage patterns
- Review database query efficiency
- Evaluate caching strategies

### 6. Maintainability & Documentation

- Assess code documentation quality
- Review API documentation completeness
- Evaluate onboarding and development setup
- Check for outdated or missing documentation

## Analysis Output Format

### Executive Summary

Provide a high-level overview of the codebase health and key findings.

### Detailed Findings

For each analysis objective, provide:

- **Status**: Excellent/Good/Needs Attention/Critical
- **Key Findings**: List 3-5 most important observations
- **Impact**: Potential impact on development workflow
- **Recommendations**: Specific actionable recommendations

### Risk Assessment

- **High Risk Issues**: Critical issues requiring immediate attention
- **Medium Risk Issues**: Issues that should be addressed soon
- **Low Risk Issues**: Nice-to-have improvements

### Next Steps

Provide prioritized recommendations for:

1. Immediate actions (within 1 week)
2. Short-term improvements (within 1 month)
3. Long-term strategic improvements (within 3 months)

## VS Code Copilot Structured Output

Format responses with clear structure optimized for VS Code markdown rendering:

<structured_output_format>

# Universal Analysis Results

## Executive Summary

- **Codebase Health**: Overall health assessment (Excellent/Good/Needs Attention/Critical)
- **Key Architecture**: Primary patterns and design decisions identified
- **Critical Findings**: Top 3 most important observations

## Analysis Matrix

| Dimension     | Status   | Score | Notes            |
| ------------- | -------- | ----- | ---------------- |
| Architecture  | ✅/⚠️/❌ | 1-10  | Brief assessment |
| Code Quality  | ✅/⚠️/❌ | 1-10  | Brief assessment |
| Security      | ✅/⚠️/❌ | 1-10  | Brief assessment |
| Testing       | ✅/⚠️/❌ | 1-10  | Brief assessment |
| Performance   | ✅/⚠️/❌ | 1-10  | Brief assessment |
| Documentation | ✅/⚠️/❌ | 1-10  | Brief assessment |

## Priority Findings

### 🔴 Critical Issues (Address Immediately)

- Issue 1 with specific impact and recommendation
- Issue 2 with specific impact and recommendation

### 🟡 Medium Issues (Address Soon)

- Issue 1 with specific impact and recommendation
- Issue 2 with specific impact and recommendation

### 🟢 Improvements (Strategic)

- Improvement 1 with potential value
- Improvement 2 with potential value

## Action Plan

### Week 1 (Critical)

- [ ] Action item 1 with clear outcome
- [ ] Action item 2 with clear outcome

### Month 1 (Important)

- [ ] Action item 1 with clear outcome
- [ ] Action item 2 with clear outcome

### Month 3 (Strategic)

- [ ] Action item 1 with clear outcome
- [ ] Action item 2 with clear outcome
      </structured_output_format>

## Context Variables

- `{{workspacePath}}` - Current workspace directory
- `{{gitBranch}}` - Current git branch
- `{{projectType}}` - Detected project type
- `{{hasChanges}}` - Whether there are uncommitted changes
- `{{dependencies}}` - List of project dependencies
- `{{recentCommits}}` - Recent commit history
- `{{issueContext}}` - Any related issues or PRs

## Success Criteria

Your analysis should enable any development workflow (issue-based, feature development, maintenance, exploration) by providing a comprehensive understanding of the current codebase state and clear guidance for next steps.
