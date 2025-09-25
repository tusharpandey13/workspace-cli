# Implementation Plan: Transform Init Message Format

## ANALYZE

- **Problem**: Current init message is single-line conditional format, need multi-line structured format
- **Affected Files**: `src/commands/init.ts` (lines 1534-1538)
- **Current Format**: Single line with conditional GitHub IDs display
- **Target Format**: Multi-line with project/branch, GitHub IDs, and workspace path

## PLAN

- [ ] Replace the current `initMessage` conditional ternary with new multi-line format
- [ ] Use template literals for multi-line string formatting
- [ ] Handle GitHub IDs display (show "None" if empty, otherwise join with commas)
- [ ] Include workspace path from `paths.workspaceDir`
- [ ] Ensure consistent formatting and spacing

## NOTES

- The new format provides better structure and more information
- All required variables (`project.name`, `branchName`, `issueIds`, `paths.workspaceDir`) are available in scope
- Need to handle empty GitHub IDs case gracefully
