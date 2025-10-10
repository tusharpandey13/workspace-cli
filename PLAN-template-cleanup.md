# Implementation Plan: Template Cleanup and Renaming

## ANALYZE

- **Problem**:
  1. `enhanced-analysis.prompt.md` is being copied to workspaces but not needed
  2. `analysis-with-sample.prompt.md` should be renamed to `analysis.prompt.md` when copied to workspaces
- **Affected Files**:
  - `src/utils/workflow.ts` - Template selection logic
  - `src/commands/init.ts` - Template copying logic (if needed)
  - Test files that verify template behavior
- **Current State**:
  - `enhanced-analysis.prompt.md` is included in both default and sample app template lists
  - `analysis-with-sample.prompt.md` is used for projects with sample repos
  - Templates are copied directly without renaming

## PLAN

- [x] Remove `enhanced-analysis.prompt.md` from all template lists in workflow.ts
- [x] Update template copying logic to rename `analysis-with-sample.prompt.md` to `analysis.prompt.md` when copying
- [x] Update documentation references that mention `enhanced-analysis.prompt.md`
- [x] Update tests to reflect the new template behavior
- [x] Verify that the changes work correctly

## NOTES

- The rename should happen during the copy operation, not by changing the source template filename
- Need to be careful not to break existing functionality for projects without sample repos
- Tests need to be updated to reflect the new template selection
