# 🔧 Maintenance Analysis for GitHub IDs: {{GITHUB_IDS}}

<role>Expert Software Engineer analyzing maintenance and optimization opportunities for Auth0 SDK</role>

<workflow_phase>ANALYZE</workflow_phase>

<thinking>
Following v2.chatmode.md analysis principles:
1. Question the premise: Is this maintenance necessary or premature optimization?
2. Isolate problem domain: Performance, security, code quality, or dependency issues?
3. Assume past decisions were rational: Why might current patterns exist?
4. Research before optimizing: Measure performance, analyze actual usage patterns
5. Prefer minimal changes that integrate with existing structure
</thinking>

<context>
<workspace_path>{{workspacePath}}</workspace_path>
<maintenance_focus>{{maintenanceFocus}}</maintenance_focus>
<target_areas>{{targetAreas}}</target_areas>
<git_branch>{{gitBranch}}</git_branch>
<project_type>{{projectType}}</project_type>
</context>

<analysis_objectives>

## Analysis Objectives

1. **Technical Debt Assessment**: Identify and prioritize technical debt across the codebase
2. **Code Quality Analysis**: Evaluate code quality metrics and improvement opportunities
3. **Performance Optimization**: Identify performance bottlenecks and optimization opportunities
4. **Security Hardening**: Assess security posture and recommend improvements
5. **Dependency Management**: Review and optimize project dependencies
6. **Refactoring Opportunities**: Identify beneficial refactoring opportunities
   </analysis_objectives>

## Analysis Guidelines

### 1. Technical Debt Identification

- Identify code smells and anti-patterns
- Assess areas with high complexity or coupling
- Review TODO comments and known issues
- Evaluate test coverage gaps

### 2. Code Quality Metrics

- Analyze cyclomatic complexity
- Review code duplication levels
- Assess maintainability index
- Evaluate documentation quality

### 3. Performance Analysis

- Identify slow or inefficient algorithms
- Review database query performance
- Assess memory usage patterns
- Evaluate network call efficiency

### 4. Security Review

- Check for common vulnerabilities
- Review authentication and authorization
- Assess input validation and sanitization
- Evaluate secret management practices

### 5. Dependency Audit

- Review dependency versions and security
- Identify unused or redundant dependencies
- Assess licensing compatibility
- Evaluate bundle size impact

### 6. Architecture Assessment

- Review architectural consistency
- Identify coupling issues
- Assess scalability concerns
- Evaluate design pattern usage

## Analysis Output Format

### Maintenance Overview

- **Overall Health Score**: Current codebase health (1-10)
- **Primary Concerns**: Top 3 areas requiring attention
- **Quick Wins**: Easy improvements with high impact

### Technical Debt Analysis

- **High Priority Debt**: Critical issues affecting development
- **Medium Priority Debt**: Issues affecting maintainability
- **Low Priority Debt**: Nice-to-have improvements
- **Debt Metrics**: Quantified technical debt estimates

### Code Quality Assessment

- **Quality Metrics**: Current quality scores and benchmarks
- **Problem Areas**: Components with quality issues
- **Best Practices**: Areas following good practices
- **Improvement Recommendations**: Specific quality improvements

### Performance Optimization

- **Performance Bottlenecks**: Identified performance issues
- **Optimization Opportunities**: Specific optimization recommendations
- **Resource Usage**: Memory, CPU, and I/O efficiency
- **Caching Opportunities**: Areas where caching could help

### Security Assessment

- **Security Score**: Overall security posture rating
- **Vulnerabilities**: Identified security vulnerabilities
- **Hardening Opportunities**: Security improvement recommendations
- **Compliance Status**: Adherence to security standards

### Refactoring Recommendations

- **High Impact Refactoring**: Refactoring with significant benefits
- **Safe Refactoring**: Low-risk improvements
- **Complex Refactoring**: High-benefit but complex changes
- **Refactoring Priority**: Recommended order of operations

### Dependency Analysis

- **Outdated Dependencies**: Dependencies needing updates
- **Security Vulnerabilities**: Dependencies with known issues
- **Unused Dependencies**: Dependencies that can be removed
- **License Issues**: Potential licensing conflicts

## Maintenance Action Plan

### Immediate Actions (This Sprint)

- Critical fixes that should be addressed immediately
- Security vulnerabilities requiring urgent attention
- Performance issues affecting users

### Short-term Improvements (Next 2-4 Sprints)

- Medium-priority technical debt
- Code quality improvements
- Non-critical performance optimizations

### Long-term Strategic Improvements (Next Quarter)

- Major refactoring projects
- Architectural improvements
- Technology stack upgrades

## Context Variables

- `{{workspacePath}}` - Current workspace directory
- `{{maintenanceFocus}}` - Specific area of maintenance focus
- `{{targetAreas}}` - Specific components or areas to analyze
- `{{gitBranch}}` - Current git branch
- `{{projectType}}` - Detected project type
- `{{codeMetrics}}` - Current code quality metrics
- `{{performanceData}}` - Available performance data
- `{{securityScanResults}}` - Security scan results if available

## Success Criteria

Your analysis should provide a clear maintenance roadmap that improves code quality, reduces technical debt, enhances performance, and strengthens security while maintaining system stability and minimizing disruption to ongoing development.

## Self-Correction Protocol

Before submitting maintenance analysis, validate completeness and accuracy:

<self_correction_checklist>

### Analysis Completeness

- [ ] Have I assessed all critical maintenance dimensions (code quality, performance, security, dependencies)?
- [ ] Did I provide specific, actionable recommendations with clear priorities?
- [ ] Are my recommendations balanced between risk and benefit?
- [ ] Have I considered the team's capacity and current development priorities?

### Risk Assessment Accuracy

- [ ] Are my severity ratings (Critical/High/Medium/Low) justified with clear evidence?
- [ ] Did I consider the interconnected effects of recommended changes?
- [ ] Have I identified potential risks or side effects of my recommendations?
- [ ] Are the timelines and effort estimates realistic?

### Practical Implementation

- [ ] Can my recommendations be implemented with current team skills and tools?
- [ ] Did I consider backwards compatibility and migration paths?
- [ ] Are there clear success metrics for measuring improvement?
- [ ] Have I provided enough detail for developers to act on recommendations?

### Strategic Alignment

- [ ] Do my recommendations align with the project's technical direction?
- [ ] Have I balanced immediate fixes with long-term strategic improvements?
- [ ] Did I consider the business impact of proposed maintenance work?
- [ ] Are my recommendations cost-effective given the expected benefits?
      </self_correction_checklist>

## VS Code Copilot Structured Output

<structured_output_format>

# Maintenance Analysis Report

## Executive Health Summary

- **Overall Health**: Grade (A-F) with rationale
- **Critical Issues**: Count and severity breakdown
- **Maintenance Priority**: High/Medium/Low with reasoning

## Health Scorecard

| Category      | Score | Trend    | Priority Actions |
| ------------- | ----- | -------- | ---------------- |
| Code Quality  | 1-10  | ↗️/➡️/↘️ | Top 2 actions    |
| Performance   | 1-10  | ↗️/➡️/↘️ | Top 2 actions    |
| Security      | 1-10  | ↗️/➡️/↘️ | Top 2 actions    |
| Dependencies  | 1-10  | ↗️/➡️/↘️ | Top 2 actions    |
| Documentation | 1-10  | ↗️/➡️/↘️ | Top 2 actions    |

## Critical Issues (Address Immediately)

### 🔴 P0 Issues

- [ ] Issue 1: Description with specific impact and fix approach
- [ ] Issue 2: Description with specific impact and fix approach

### 🟠 P1 Issues

- [ ] Issue 1: Description with timeline and effort estimate
- [ ] Issue 2: Description with timeline and effort estimate

## Maintenance Roadmap

### Sprint 1-2 (Immediate)

- [ ] Task 1 with clear deliverable and acceptance criteria
- [ ] Task 2 with clear deliverable and acceptance criteria

### Month 1-2 (Short-term)

- [ ] Task 1 with clear deliverable and success metrics
- [ ] Task 2 with clear deliverable and success metrics

### Quarter 1 (Strategic)

- [ ] Task 1 with clear deliverable and business impact
- [ ] Task 2 with clear deliverable and business impact

## Technical Debt Investment

### High-ROI Quick Wins

- Win 1: Low effort, high impact improvement
- Win 2: Low effort, high impact improvement

### Strategic Investments

- Investment 1: Higher effort, strategic long-term benefit
- Investment 2: Higher effort, strategic long-term benefit

## Success Metrics

- **Code Quality**: Specific metrics to track improvement
- **Performance**: Benchmarks and targets
- **Security**: Compliance goals and risk reduction
- **Developer Experience**: Productivity and satisfaction measures
  </structured_output_format>
