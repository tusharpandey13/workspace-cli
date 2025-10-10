# Implementation Plan: Integrate Post-Init into Main Progress Flow

## ANALYZE

- **Problem**: Post-init runs in background after "Workspace ready", causing confusion about when initialization is actually complete
- **Domain Context**: Progress bar system should include all initialization steps, including dependency installation
- **Current Flow**: Progress bar completes → "Workspace ready" → post-init runs in background
- **Desired Flow**: Progress bar includes post-init step → "Workspace ready" only when everything is complete
- **UX Issue**: Users think workspace is ready when dependencies are still installing
- **Evidence**: Post-init completion shows after "Workspace ready" message

## PLAN

- [ ] **EXAMINE PROGRESS INDICATOR**: Review how progress steps are defined and managed
- [ ] **ADD POST-INIT STEP**: Add post-init as a proper step in the progress indicator
- [ ] **MAKE POST-INIT SYNCHRONOUS**: Move post-init execution before "Workspace ready" message
- [ ] **UPDATE PROGRESS FLOW**: Ensure post-init step is tracked and displayed properly
- [ ] **CLEAN UP BACKGROUND HANDLING**: Remove background promise handling for post-init
- [ ] **TEST INTEGRATED FLOW**: Verify that progress bar shows post-init step and completes properly

## DESTRUCTIVE OPERATIONS

- None identified in this plan

## NOTES

- This will make initialization take longer but provide much clearer UX
- Progress bar should show post-init step with appropriate messaging
- "Workspace ready" should only appear when everything is truly complete
