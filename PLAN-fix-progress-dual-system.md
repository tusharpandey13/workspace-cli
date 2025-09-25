# Implementation Plan: Fix Dual Progress System

## ANALYZE

- **Problem**: CLI has two progress systems - modern ProgressIndicator (TTY-only) and legacy console.log (non-TTY)
- **Root Cause**: TTY detection prevents ProgressIndicator initialization in non-interactive environments
- **Evidence**: E2E test shows "[1/4]" format while direct CLI shows proper progress bars
- **Affected Files**: `src/commands/init.ts` (12 console.log statements), `src/utils/progressIndicator.ts`

## PLAN

### Phase 1: Remove Legacy Console.log System

- [ ] Remove all 12 instances of old "[1/4]", "[2/4]", "[3/4]", "[4/4]" console.log statements from init.ts
- [ ] Remove all `if (progressIndicator.isActive()) { ... } else { console.log... }` conditionals
- [ ] Ensure all progress updates go through ProgressIndicator only

### Phase 2: Improve ProgressIndicator for Non-TTY

- [ ] Modify ProgressIndicator to handle non-TTY environments gracefully
- [ ] Add fallback text-based progress for non-TTY (simple "Step X of Y: Description..." format)
- [ ] Ensure initialization always succeeds, even without TTY

### Phase 3: Fix Readline Integration

- [ ] Implement proper pause/resume for overwrite prompts
- [ ] Test overwrite prompt doesn't interfere with progress display
- [ ] Ensure user input doesn't corrupt progress output

### Phase 4: E2E Validation

- [ ] Run E2E test to confirm single progress system
- [ ] Verify overwrite prompt works without corruption
- [ ] Test both TTY and non-TTY scenarios
- [ ] Confirm cleanup step appears in progress

### Phase 5: Final Cleanup

- [ ] Remove unused imports related to old progress system
- [ ] Run linting and formatting
- [ ] Update any relevant documentation

## TECHNICAL NOTES

- Keep ProgressIndicator as single source of truth for all progress updates
- Non-TTY environments should get simple text progress, not silence
- Maintain backward compatibility for existing workflows
- Focus on consistency rather than fancy animations for non-TTY

## SUCCESS CRITERIA

- Single progress system active in all environments
- No "[1/4]" style output in any scenario
- Overwrite prompts work without output corruption
- All 5 user-reported issues resolved
- E2E test passes with expected progress format
