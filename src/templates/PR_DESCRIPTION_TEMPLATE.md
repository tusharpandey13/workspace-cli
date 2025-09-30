# 🚨 MANDATORY PR DESCRIPTION REQUIREMENTS

> **⚠️ CRITICAL**: This template uses Claude-inspired validation patterns. **ALL** sections marked as MANDATORY must be completed thoroughly. Incomplete descriptions will be rejected.

---

## 🎯 PR TITLE & SUMMARY

**Title Format (MANDATORY)**: `{prefix}: {concise description}`

- **Prefixes**: `feat:` | `fix:` | `chore:` | `refactor:` | `docs:` | `test:`

**Summary (MANDATORY - Max 2 sentences)**:
{Write what this PR accomplishes and the business/technical value}

---

## ✅ PRE-SUBMISSION VALIDATION (MANDATORY)

### Critical Requirements (Must Check ALL)

- [ ] **Code Quality**: All new/changed functionality is covered by tests
- [ ] **Documentation**: Added docs for all new/changed public APIs
- [ ] **Breaking Changes**: None, or documented with migration guide
- [ ] **Security Review**: No secrets, credentials, or security vulnerabilities introduced
- [ ] **Performance Impact**: Considered and validated (or N/A)

### Stop Gates - Answer "NO" to ANY = DO NOT SUBMIT

- [ ] Is this change actually necessary and well-justified?
- [ ] Does this change follow established project patterns?
- [ ] Have you tested this change thoroughly?
- [ ] Is the scope appropriate (not too large/complex)?
- [ ] Are you confident this won't break existing functionality?

**🛑 If you answered "NO" to any Stop Gate question, STOP and address the issue before submitting.**

---

## � ROOT CAUSE ANALYSIS (For Bug Fixes Only)

**Only include if fixing a bug/issue:**

**What was broken?**
{1-2 sentence description}

**Why did it break?**
{Root cause explanation}

**How does this fix it?**
{Solution approach}

---

## 📋 DETAILED CHANGES (MANDATORY)

### What Changed and Why

{Explain the technical changes and business justification}

### API/Usage Changes (If Applicable)

```typescript
// Before
{old usage example}

// After
{new usage example}
```

### File-by-File Breakdown (MANDATORY)

**Use this exact format:**

{operation} `{path}`: {short description}

**Operations**: `Added` | `Modified` | `Deleted` | `Deprecated`

**Example:**

```
Modified `src/auth/login.ts`: Enhanced OAuth2 flow with PKCE support
Added `test/auth/login.test.ts`: Comprehensive test coverage for OAuth2 changes
```

---

## 🧪 TESTING STRATEGY (MANDATORY)

### Automated Testing

**What tests were added/modified?**
{Description of test coverage}

**Test Commands:**

```bash
# Commands reviewers should run to verify
npm test
npm run e2e
```

### Manual Testing Required

**Step-by-step verification for reviewers:**

1. {Specific test step}
2. {Expected outcome}
3. {How to verify success}

**⚠️ Untested Areas**: {List anything not covered by tests and why}

---

## 📎 REFERENCES & CONTEXT

### Issue Tracking

<!--
MANDATORY for bug fixes - use exact format:
Fixes: #{{ISSUE_ID}}
-->

### Supporting Links

<!--
Include relevant:
- RFC docs / specifications
- Community discussions
- Related PRs/issues
- Design documents

Delete this section if no references.
-->

---

## 🔒 SECURITY CONSIDERATIONS

### Security Impact Assessment (MANDATORY)

- [ ] **Authentication**: No changes to auth logic OR changes reviewed by security team
- [ ] **Authorization**: No privilege escalation OR properly validated
- [ ] **Data Handling**: No sensitive data exposure OR proper sanitization added
- [ ] **Input Validation**: All user inputs validated OR N/A
- [ ] **Dependencies**: No new dependencies with known vulnerabilities

**🚨 Security Changes**: {If any security-related changes, describe them here}

---

## 📊 PERFORMANCE & MONITORING

### Performance Impact

- [ ] **Memory Usage**: Validated OR N/A
- [ ] **Response Time**: Measured OR N/A
- [ ] **Database Queries**: Optimized OR N/A
- [ ] **Bundle Size**: Checked OR N/A

### Monitoring & Rollback

- [ ] **Metrics**: Added monitoring for new functionality OR N/A
- [ ] **Rollback Plan**: Documented if this is a high-risk change

---

## 🎯 REVIEWER GUIDANCE

### Priority Review Areas

1. {Specific areas requiring extra attention}
2. {Known complexity or edge cases}
3. {Areas where you're uncertain}

### Review Checklist for Reviewers

- [ ] Code follows project patterns and conventions
- [ ] Tests adequately cover the changes
- [ ] Documentation is clear and complete
- [ ] Security implications are addressed
- [ ] Performance impact is acceptable

---

## 📝 DIFF ANALYSIS

**IMPORTANT FORMATTING RULES:**

- Use h3 headings (###) for all sections
- Write like a human developer, not an AI
- Keep everything scannable and direct
- No unnecessary fluff or marketing language
- Make keywords `code formatted` for clarity

**Changes to analyze:**
{{CHANGES_DESCRIPTION}}
