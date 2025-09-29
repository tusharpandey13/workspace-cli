# Implementation Plan: Skip Performance Tests in CI/Development

## ANALYZE

- **Problem**: Performance tests are flaky and environment-dependent, causing CI failures
- **Goal**: Skip performance tests in CI/development environments while allowing them to run when needed
- **Approach**: Use environment variable to conditionally skip performance test suites
- **Affected Files**: `test/performance/*.test.ts`, `package.json` scripts, `vitest.config.ts`
- **Risks**: Need to ensure performance tests can still be run when explicitly requested

## PLAN

- [x] Add environment variable check `SKIP_PERFORMANCE_TESTS`
- [x] Modify performance test files to conditionally skip when environment variable is set
- [x] Update package.json scripts to set the environment variable for regular test runs
- [x] Add separate script for running performance tests explicitly
- [x] Update vitest config if needed for better performance test handling (not needed)
- [x] Test the implementation to ensure it works correctly

## NOTES

- Use `SKIP_PERFORMANCE_TESTS=true` environment variable
- Performance tests should still be runnable with explicit command
- Keep the performance test code intact for when needed
- Default behavior should skip performance tests in development
