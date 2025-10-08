# Implementation Plan: Parallel Progress Bar Enhancement

## ANALYZE - Current Issues with Linear Progress Bar

**Current Implementation Problems:**

- Linear progress bar shows `worktrees` → `context` sequentially when they run in parallel
- Post-init appears to complete immediately but actually runs in background
- No visual indication of parallel operations happening simultaneously
- Progress weights are static and don't reflect actual operation timing
- Users get misleading impression of execution flow

**Evidence from Code:**

```typescript
// These actually run in parallel but progress bar shows them sequentially
progressIndicator.startStep('worktrees');
progressIndicator.startStep('context');
const parallelResults = await initCoordinator.executeInParallel(['context', 'worktrees']);
```

## DESIGN IMPROVEMENTS

### 1. **Parallel Progress Visualization** 🎯

Use `cli-progress.MultiBar` to show concurrent operations visually:

```
📦 Setting up workspace
├─ [████████████████████████████] Creating directories (100%)
├─ [████████████░░░░░░░░░░░░░░░░] Setting up worktrees (60%)
└─ [████████████████░░░░░░░░░░░░] Gathering context (75%)
```

### 2. **Background Operations Indicator** ⚡

Show post-init as a separate background operation:

```
🔄 Background Tasks
└─ [████████░░░░░░░░░░░░░░░░░░░░] Running post-init (40%)
```

### 3. **Dynamic Progress Weights** 📊

Calculate progress based on actual operation completion rather than fixed weights.

### 4. **Phase-Based Progress** 🚀

Group operations by execution phase:

- **Phase 1**: Critical (directories)
- **Phase 2**: Parallel (worktrees + context)
- **Phase 3**: Background (post-init)

## PLAN

### Phase 1: Enhance ProgressIndicator with MultiBar Support

- [ ] Add `initializeParallelProgress()` method to ProgressIndicator
- [ ] Extend ProgressStep interface to support parallel grouping
- [ ] Add `ProgressPhase` concept for grouping operations
- [ ] Implement dynamic progress calculation based on actual completion

### Phase 2: Update Init Flow to Use Parallel Progress

- [ ] Modify `initializeWorkspace()` to use parallel progress bars
- [ ] Add phase-based progress initialization
- [ ] Update progress tracking for parallel operations
- [ ] Implement background operation progress tracking

### Phase 3: Visual Enhancements

- [ ] Add icons/emojis for different operation types
- [ ] Implement progress bar colors (green for complete, blue for active, gray for waiting)
- [ ] Add ETA calculation for each operation
- [ ] Show operation status (waiting, running, complete, failed)

### Phase 4: Fallback and Compatibility

- [ ] Maintain backward compatibility with linear progress for simple cases
- [ ] Add environment variable to disable parallel progress (`WORKSPACE_LINEAR_PROGRESS=true`)
- [ ] Ensure graceful fallback in non-TTY environments
- [ ] Add tests for both parallel and linear progress modes

## IMPLEMENTATION DETAILS

### Enhanced ProgressStep Interface

```typescript
export interface ProgressStep {
  id: string;
  description: string;
  weight: number;
  phase?: 'critical' | 'parallel' | 'background';
  parallel?: boolean;
  dependencies?: string[];
}

export interface ProgressPhase {
  name: string;
  operations: ProgressStep[];
  canRunInParallel: boolean;
}
```

### New ProgressIndicator Methods

```typescript
class ProgressIndicator {
  initializeParallelProgress(phases: ProgressPhase[]): void;
  startPhase(phaseName: string): void;
  updateOperationProgress(operationId: string, progress: number): void;
  completeOperation(operationId: string): void;
  setBackgroundOperation(operationId: string, description: string): void;
}
```

### Updated Init Flow Structure

```typescript
// Phase 1: Critical operations
const criticalPhase = {
  name: 'Setup',
  operations: [{ id: 'directories', description: 'Creating workspace', weight: 1 }],
  canRunInParallel: false,
};

// Phase 2: Parallel operations
const parallelPhase = {
  name: 'Parallel Setup',
  operations: [
    { id: 'worktrees', description: 'Setting up worktrees', weight: 3, parallel: true },
    { id: 'context', description: 'Gathering context', weight: 2, parallel: true },
  ],
  canRunInParallel: true,
};

// Phase 3: Background operations
const backgroundPhase = {
  name: 'Background Tasks',
  operations: [
    { id: 'postinit', description: 'Running post-init', weight: 1, phase: 'background' },
  ],
  canRunInParallel: false,
};
```

## SUCCESS METRICS

- [ ] Users can visually see parallel operations running simultaneously
- [ ] Progress accurately reflects actual operation timing
- [ ] Background operations are clearly indicated as non-blocking
- [ ] Fallback works correctly in non-TTY environments
- [ ] No performance regression in progress tracking
- [ ] Maintains existing CLI output behavior for automated scripts

## NOTES

- Use existing `cli-progress.MultiBar` infrastructure from progressIndicator.ts
- Leverage AsyncOperationCoordinator's parallel execution results for progress updates
- Ensure compatibility with existing `--silent` and `--dry-run` modes
- Consider adding visual indicators for operation dependencies
- Post-init should show as "running in background" rather than completing immediately

---

**Priority**: Medium-High (improves user experience significantly)
**Complexity**: Medium (builds on existing infrastructure)
**Risk**: Low (additive changes with fallback support)
