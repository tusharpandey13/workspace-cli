# Implementation Plan: Remove PR_REVIEW_INSTRUCTIONS.md from Template Copying

## ANALYZE

- **Problem**: User wants to remove `PR_REVIEW_INSTRUCTIONS.md` from getting copied to workspaces during initialization
- **Affected Files**:
  - `src/utils/workflow.ts` - Template selection logic (3 functions need updates)
  - Multiple test files that expect this template to be present
- **Current State**:
  - `PR_REVIEW_INSTRUCTIONS.md` is included in all three template functions: `getDefaultTemplates()`, `getSampleAppTemplates()`, `getMinimalTemplates()`
  - 17 test assertions expect this template to be present
- **Risks**: Test failures if not all expectations are updated

## PLAN

- [ ] Remove `PR_REVIEW_INSTRUCTIONS.md` from `getDefaultTemplates()` in `src/utils/workflow.ts`
- [ ] Remove `PR_REVIEW_INSTRUCTIONS.md` from `getSampleAppTemplates()` in `src/utils/workflow.ts`
- [ ] Remove `PR_REVIEW_INSTRUCTIONS.md` from `getMinimalTemplates()` in `src/utils/workflow.ts`
- [ ] Update test expectations in `test/workflow.test.ts`
- [ ] Update test expectations in `test/conditional-template-copying.test.ts`
- [ ] Update test expectations in `test/advanced-templates.test.ts`
- [ ] Build the project and run tests to validate changes
- [ ] Test with actual CLI execution to verify template is no longer copied
- [ ] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` across modified files

## NOTES

- This is similar to the previous removal of `enhanced-analysis.prompt.md`
- Need to update template count expectations from 5 to 4 in relevant tests
- The template file itself (`src/templates/PR_REVIEW_INSTRUCTIONS.md`) will remain but won't be copied
