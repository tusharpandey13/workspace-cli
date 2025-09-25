# Implementation Plan: Fix Progress Bar Issues v2

## ANALYZE

- **Problem**: Multiple progress bars, hidden prompts, output corruption, emoji overuse, GitHub validation on separate line
- **Root Causes**:
  1. readline interface interferes with cli-progress rendering when prompting for workspace overwrite
  2. GitHub validation uses console.log instead of progress text
  3. Logger and progress indicator both add emojis causing duplication
  4. Progress bar doesn't properly handle readline interruption
  5. "0/8y" suggests user input bleeding into progress display

## PLAN

- [ ] **Fix readline interference**: Properly stop/restart progress bar around readline prompts
- [ ] **Integrate GitHub validation**: Make GitHub validation part of progress step text instead of separate console.log
- [ ] **Remove emoji duplication**: Remove emojis from logger output to avoid double emojis with progress
- [ ] **Clean final output**: Ensure progress bar properly completes without corruption
- [ ] **Test readline flow**: Verify prompt visibility and progress restoration
- [ ] **Validate clean output**: Test with and without existing workspace scenarios
- [ ] **[LOW PRIORITY]** Run linting after functional fixes

## IMPLEMENTATION NOTES

- Need to pause progress bar before readline and resume after
- GitHub validation should update progress step text, not print separate line
- Logger emojis should be removed when progress is active
- Progress completion should be clean without text bleeding
