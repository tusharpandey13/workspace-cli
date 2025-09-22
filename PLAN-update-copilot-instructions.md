# Implementation Plan: Update Copilot Instructions - NPX Warning

## ANALYZE

- **Problem**: Using `npx vitest` causes sudo password prompts during test execution, which hangs tests and creates security concerns
- **Root Cause**: NPX behavior conflicts with the project's pnpm-based setup and may trigger system-level operations
- **Affected Files**: `.github/copilot-instructions.md`
- **Current Behavior**: Instructions don't warn about npx usage
- **Expected Behavior**: Clear warning against npx usage, with guidance to use pnpm exec instead

## DESIGN

Add a clear warning in the testing section about:

1. Never using npx for vitest or other test commands
2. Always using pnpm exec instead
3. Explanation of the sudo prompt issue
4. Consistent with existing pnpm-only guidance

## PLAN

- [ ] Read current copilot instructions to understand structure
- [ ] Add NPX warning to the testing section
- [ ] Update essential commands to reinforce pnpm usage
- [ ] Add to troubleshooting section with clear symptoms
- [ ] Validate formatting and consistency

## NOTES

- This should be prominently placed in the testing section
- Should reference the existing pnpm-only guidance for consistency
- Include the specific symptom (sudo prompts) for easy identification
