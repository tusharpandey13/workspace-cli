## Principal Engineer Code Review for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:**### 2. Human-Supervised Review Framework
**You are the principal engineer making all decisions. Use LLM analysis as input, not direction.**

Challenge each significant change with:
- *Efficiency*: "Why this approach vs alternatives? What's the complexity cost?"
- *Security*: "What attack vectors does this introduce? How is input validated?"
- *Maintainability*: "Will future developers understand this? Is it testable?"
- *Compatibility*: "Does this break existing APIs? What's the migration path?"

**Manual Verification Required**:
- Trace through critical code paths by hand
- Verify error handling covers all edge cases  
- Confirm TypeScript types are accurate and helpful
- Check for proper resource cleanup and memory managementy to complete this review in **≤ 45 min**.

## Scope
Review **only** changes inside `{{SDK_PATH}}` (the NextJS-Auth0 SDK). Ignore any edits in sample apps or other directories.

For quick context you may run:
```bash
git -C {{SDK_PATH}} diff --stat origin/main...HEAD
```

## Technical Context & Review Standards

### NextJS Auth0 SDK Critical Areas
- **Session management security**: Cookie encryption, XSS prevention
- **Performance impact**: Bundle size, async operations, memory usage  
- **API compatibility**: Backward compatibility, TypeScript definitions
- **Error handling robustness**: Graceful degradation, proper logging
- **Configuration validation**: Environment setup, runtime checks

### Common Anti-Patterns to Flag
- **❌ Direct cookie manipulation** instead of session APIs
- **❌ Synchronous operations** in async contexts
- **❌ Missing error boundaries** in critical paths
- **❌ Hard-coded URLs/secrets** instead of configuration
- **❌ Overly complex abstractions** that obscure simple operations
- **❌ Missing TypeScript types** or using `any`

### Quality Indicators to Validate
- **✅ Defensive programming** - Input validation and error handling
- **✅ Single responsibility** - Functions/classes have clear, focused purpose
- **✅ Proper abstraction levels** - Not too generic, not too specific
- **✅ Consistent patterns** - Follows existing SDK conventions
- **✅ Comprehensive testing** - Unit, integration, and edge cases covered
- **✅ Clear documentation** - Self-documenting code with helpful comments Engineer Code Review for GitHub IDs: {{GITHUB_IDS}}

> ⏲ **Time-box:** Try to complete this review in **≤ 45 min**.

## Scope
Review **only** changes inside `{{SDK_PATH}}` (the NextJS-Auth0 SDK). Ignore any edits in sample apps or other directories.

For quick context you may run:
```bash
git -C {{SDK_PATH}} diff --stat origin/main...HEAD
```

## Background
Refer to `{{BUGREPORT_FILE}}` for the implementation context.

## GitHub Issues/PRs Context
{{GITHUB_DATA}}

## Related Issues & PRs (User Input)
{{RELATED_ISSUES_PRS}}

## Additional Context (User Input)
{{ADDITIONAL_CONTEXT}}

## Review Checklist (pre-filled)
- [ ] Security ⬜  
- [ ] Performance ⬜  
- [ ] Reliability ⬜  
- [ ] Maintainability ⬜  
- [ ] Compatibility ⬜  
- [ ] Monitoring ⬜  
- [ ] Documentation ⬜  

---

## Core Review Methodology
(Use the guidelines below while reviewing; adapt wording as needed.)

### 1. Fundamental Code Review Areas
**Architecture & Design**: evaluate structure, modularity, error handling…

**Performance & Efficiency**: look for bottlenecks, async usage, bundle size…

**Security & Safety**: audit for XSS, injections, secret leakage…

**Reliability & Maintainability**: logging, readability, test coverage…

### 2. Cross-Questioning Framework
Challenge each significant change with:
- *Efficiency*: “Why this approach vs alternative? Complexity?”
- *Design*: “Trade-offs? API surface impact?”
- *Prod Readiness*: “Edge cases? Rollback strategy?”

### 3. JS SDK-Specific Focus
Bundle strategy, typings, browser compatibility, developer experience.

### 4. Production Readiness Checklist
Security / Performance / Reliability / Maintainability / Compatibility / Monitoring / Docs

### 5. Review Output Format
1. **Executive Summary** – quality assessment & approval status.  
2. **Detailed Findings** – Critical / Major / Minor issues.  
3. **Cross-Examination** – key Q&A and alternatives.  
4. **Action Items** – prioritized changes & recommendations.

### 6. Final Validation Questions
“Would I stake my reputation…?” “Can this handle 10× load?” …

---

Fill in each section to deliver a thorough, enterprise-grade review.
