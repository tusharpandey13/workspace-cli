# Implementation Plan: Fix Progress Bar Rendering Issues

## ANALYZE

- **Problem**: Progress bar has multiple rendering issues causing corrupted display and double output
- **Root Causes**:
  1. `setCurrentOperation()` using console.log interferes with cli-progress rendering
  2. Cleanup phase not included in progress tracking
  3. Progress bar format may have text spacing issues
  4. Potential cursor management conflicts between manual console.log and cli-progress
- **Affected Files**: `src/utils/progressIndicator.ts`, `src/commands/init.ts`
- **Critical Issues**: User experience severely degraded with corrupted progress display

## PLAN

### Task 1: Fix Double Progress Bar Issue

- [ ] **Task 1.1**: Remove console.log from setCurrentOperation()
  - [ ] cli-progress handles its own display, manual console.log interferes
  - [ ] Instead, integrate operation context into progress bar format string
  - [ ] Use cli-progress payload system to show current operation

- [ ] **Task 1.2**: Update progress bar format to include operation context
  - [ ] Change format to include operation description in the progress bar itself
  - [ ] Format: "{operation} [{bar}] {value}/{total}" where {operation} is dynamic
  - [ ] Remove separate console.log output that causes interference

### Task 2: Include Cleanup in Progress Tracking

- [ ] **Task 2.1**: Add cleanup step to progress definition
  - [ ] Add 'cleanup' step as first step with weight 1
  - [ ] Update total steps from 4 to 5, total weight from 7 to 8
  - [ ] Start progress before handleExistingWorkspace()

- [ ] **Task 2.2**: Update init workflow to track cleanup
  - [ ] Move progress initialization before handleExistingWorkspace()
  - [ ] Add progressIndicator.startStep('cleanup') during cleanup
  - [ ] Add progressIndicator.completeStep('cleanup') after cleanup

### Task 3: Fix Text Formatting and Cursor Issues

- [ ] **Task 3.1**: Improve progress bar format spacing
  - [ ] Ensure proper spacing between progress bar and text
  - [ ] Add padding/margins to prevent text bleeding
  - [ ] Test format string for proper rendering

- [ ] **Task 3.2**: Fix completion message rendering
  - [ ] Remove separate console.log for "✅ Complete!"
  - [ ] Let cli-progress handle completion messaging
  - [ ] Ensure proper line breaks after progress completion

### Task 4: Validate Progress Step Updates

- [ ] **Task 4.1**: Debug progress step tracking
  - [ ] Add debug logging to track currentStep increments
  - [ ] Verify each step weight is being added correctly
  - [ ] Ensure progress bar updates with correct values

- [ ] **Task 4.2**: Test progress flow end-to-end
  - [ ] Test with cleanup scenario (existing workspace)
  - [ ] Test without cleanup scenario (new workspace)
  - [ ] Verify progress shows 0->1->4->6->7->8 correctly

## VALIDATION CRITERIA

- **Single Progress Bar**: Only one progress display, no duplicate bars
- **Smooth Progress**: Progress moves from 0 to total steps correctly
- **Clean Text**: No text bleeding, proper spacing and formatting
- **Includes Cleanup**: Cleanup phase shows in progress when needed
- **Proper Completion**: Clean completion without text overlap

## NOTES

- cli-progress expects to control terminal output - manual console.log interferes
- Format string and payload system should be used for dynamic content
- Cursor management must be left to cli-progress library
- Progress steps must be carefully tracked and weighted
