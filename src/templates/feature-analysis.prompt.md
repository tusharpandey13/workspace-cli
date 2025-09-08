# 🚀 Feature Development Analysis for GitHub IDs: {{GITHUB_IDS}}

<role>Expert NextJS-Auth0 SDK Architect analyzing feature requirements</role>

<workflow_phase>ANALYZE</workflow_phase>

<thinking>
Following v2.chatmode.md analysis principles:
1. Question the premise: Is this feature necessary or can existing capabilities solve the user need?
2. Isolate problem domain: Authentication, user management, security, or developer experience?
3. Assume past decisions were rational: Why might current patterns exist?
4. Research before designing: Check Auth0 APIs, NextJS patterns, security implications
</thinking>

<context>
<workspace_path>{{workspacePath}}</workspace_path>
<feature_description>{{featureDescription}}</feature_description>
<target_components>{{targetComponents}}</target_components>
<git_branch>{{gitBranch}}</git_branch>
<project_type>{{projectType}}</project_type>
<sample_path>{{SAMPLE_PATH}}</sample_path>
<sdk_path>{{SDK_PATH}}</sdk_path>
</context>

## Infrastructure Validation

**Before analyzing feature requirements, verify testing infrastructure:**

```bash
# Verify sample app testing infrastructure works
cd {{SAMPLE_PATH}}
npm run test                # Should pass baseline tests
npm run test:coverage       # Verify coverage reporting

# Verify SDK build and test infrastructure
cd {{SDK_PATH}}
pnpm run test              # Should pass existing tests
pnpm run build             # Should build successfully
```

**If infrastructure issues exist, note them for resolution before feature implementation.**

<analysis_objectives>

## Analysis Objectives

1. **Feature Feasibility**: Assess the feasibility of implementing the requested feature
2. **Architecture Impact**: Understand how the feature fits into existing architecture
3. **Implementation Strategy**: Define the best approach for feature implementation
4. **Testing Strategy**: Plan comprehensive testing for the new feature
5. **Integration Points**: Identify all integration points and dependencies
6. **Risk Assessment**: Evaluate potential risks and mitigation strategies
   </analysis_objectives>

## Analysis Guidelines

### 1. Feature Requirements Analysis

- Break down the feature into atomic components
- Identify functional and non-functional requirements
- Map feature requirements to existing capabilities
- Identify gaps that need to be filled

### 2. Architecture Integration

- Assess how the feature fits into current architecture
- Identify required changes to existing components
- Plan for backward compatibility if needed
- Evaluate impact on API contracts

### 3. Implementation Approach

- Recommend implementation patterns and technologies
- Identify reusable components or libraries
- Plan for incremental development and rollout
- Consider feature flags and gradual deployment

### 4. Data Flow and State Management

- Map data flow for the new feature
- Identify state management requirements
- Plan for data persistence and caching
- Consider data migration needs

### 5. Testing and Validation Strategy

- Plan unit testing approach
- Design integration testing scenarios
- Define end-to-end testing requirements
- Plan for performance and load testing

### 6. Dependencies and Integration

- Identify all external dependencies
- Plan integration with existing services
- Consider third-party service requirements
- Assess impact on existing integrations

## VS Code Copilot Structured Analysis Output

### Executive Summary

**Feature Name:** [Clear, descriptive name]
**Complexity Level:** [LOW/MEDIUM/HIGH/CRITICAL]
**Development Effort:** [1-3 days/1-2 weeks/1+ months]
**Risk Assessment:** [LOW/MEDIUM/HIGH/CRITICAL]

### Feature Overview

```markdown
**Feature Summary:** [Clear description of what will be built]
**Success Criteria:** [Measurable criteria for feature success]
**User Stories:** [Key user stories the feature addresses]
**Business Value:** [Why this feature is needed]
```

### Technical Architecture

```markdown
**Architecture Changes:** [Required changes to current architecture]
**Integration Points:** [How feature integrates with existing components]
**Data Flow:** [How data moves through the feature]
**API Changes:** [New or modified APIs]
```

### Implementation Plan

```markdown
**Technology Stack:** [Recommended technologies and patterns]
**Development Phases:** [Breakdown into implementable phases]
**Dependencies:** [External and internal dependencies]
**Risk Mitigation:** [How to address identified risks]
```

### Testing Strategy

```markdown
**Unit Testing:** [Testing approach for individual components]
**Integration Testing:** [Testing approach for component interactions]
**E2E Testing:** [End-to-end testing scenarios]
**Performance Testing:** [Performance and load testing requirements]
```

### Compatibility & Security

```markdown
**Breaking Changes:** [Any breaking changes and migration strategy]
**Security Considerations:** [Security implications and mitigations]
**Browser Support:** [Browser compatibility requirements]
**Accessibility:** [Accessibility considerations]
```

- **Performance Considerations**: Expected performance impact

### Implementation Plan

- **Development Phases**: Breakdown of implementation phases
- **Estimated Timeline**: Rough timeline estimates for each phase
- **Resource Requirements**: Team skills and resources needed
- **Critical Path**: Dependencies and potential blockers

### Testing Strategy

- **Unit Testing**: Specific unit testing requirements
- **Integration Testing**: Integration testing scenarios
- **End-to-End Testing**: User journey testing plans
- **Performance Testing**: Performance validation approach

### Risk Assessment

- **Technical Risks**: Potential technical challenges
- **Integration Risks**: Risks related to system integration
- **Timeline Risks**: Potential timeline impacts
- **Mitigation Strategies**: Specific risk mitigation approaches

### Sample App Impact

- **Validation Requirements**: How to validate the feature in sample apps
- **Sample App Changes**: Required changes to existing sample apps
- **New Sample Scenarios**: New sample app scenarios to create
- **Behavior Verification**: Expected behaviors to verify

## Context Variables

- `{{workspacePath}}` - Current workspace directory
- `{{featureDescription}}` - Description of the feature to implement
- `{{targetComponents}}` - Components that will be affected
- `{{gitBranch}}` - Current git branch
- `{{projectType}}` - Detected project type
- `{{existingFeatures}}` - List of existing similar features
- `{{userRequirements}}` - Specific user requirements
- `{{constraints}}` - Any implementation constraints

## Success Criteria

Your analysis should provide a clear roadmap for feature development that minimizes risk, maximizes code reuse, and ensures high-quality implementation that integrates seamlessly with existing systems.
