# Implementation Plan: Fix Progress Bar Issues V3

## ANALYZE

- **Problem**: Progress bar still has 5 critical issues: multiple outputs, hidden prompts, display corruption, emoji overuse, GitHub validation on separate line
- **Affected Files**: `src/utils/progressIndicator.ts`, `src/commands/init.ts`, logger system
- **Risks**: Terminal corruption, user input interference with progress display
- **Evidence**: User output shows "0/8y" corruption and duplicate progress bars

## PLAN

- [ ] **Task 1**: Add pause/resume methods to ProgressIndicator to stop progress during readline prompts
- [ ] **Task 2**: Update handleExistingWorkspace to pause progress before prompt and resume after
- [ ] **Task 3**: Remove GitHub validation console.log and integrate into progress step
- [ ] **Task 4**: Remove emoji duplication from logger methods
- [ ] **Task 5**: Clean up progress indicator emoji usage
- [ ] **Task 6**: Build, test, and validate fixes

## NOTES

- Need to prevent readline from interfering with cli-progress display
- GitHub validation should be part of progress text, not separate line
- Remove emoji duplication between logger and progress system
