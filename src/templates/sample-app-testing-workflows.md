# Sample App Testing Workflow Guidance

## Overview

This document provides specific testing workflow guidance for each sample app type with pre-configured testing infrastructure.

## Next.js Sample Apps

### Pre-Configured Infrastructure

- **Vitest**: Unit testing with React Testing Library
- **Playwright**: E2E testing with browser automation
- **MSW**: Mock Service Worker for Auth0 API mocking
- **Coverage**: HTML reports and JUnit XML output

### Testing Commands

```bash
cd {{SAMPLE_PATH}}
npm run test                # Run unit tests (vitest --run)
npm run test:watch          # Watch mode for development
npm run test:e2e            # End-to-end tests with Playwright
npm run test:coverage       # Coverage reports with HTML output
npm run test:debug          # Debug test failures
```

### Test File Organization

```
{{SAMPLE_PATH}}/
├── tests/
│   ├── auth.test.ts        # Auth0 authentication flows
│   ├── pages.test.ts       # Next.js page components
│   ├── api.test.ts         # API route testing
│   ├── setup.ts            # Test setup and configuration
│   ├── mocks/
│   │   ├── handlers.ts     # MSW request handlers
│   │   └── server.ts       # MSW server setup
│   └── utils/
│       └── test-utils.ts   # Testing utilities
├── vitest.config.ts        # Vitest configuration
├── playwright.config.ts    # Playwright E2E configuration
└── package.json           # Test scripts pre-configured
```

### Auth0-Specific Testing Patterns

- **Login Flow Testing**: Mock Auth0 authorization and token exchange
- **Protected Route Testing**: Test route protection and redirects
- **Session Management**: Test session persistence and refresh
- **API Integration**: Mock Auth0 Management API calls

### Common Test Scenarios

```typescript
// Example: Test login flow
describe('Auth0 Login', () => {
  it('should redirect to Auth0 login page', async () => {
    // Uses pre-configured MSW handlers
    // Extends existing test scaffolding
  });
});
```

---

## SPA (Single Page Application) Sample Apps

### Pre-Configured Infrastructure

- **Vitest**: Unit testing with jsdom environment
- **Playwright**: E2E browser testing
- **MSW**: Mock Service Worker for API mocking
- **Testing Library**: DOM testing utilities

### Testing Commands

```bash
cd {{SAMPLE_PATH}}
npm run test                # Run unit tests with jsdom
npm run test:watch          # Watch mode for development
npm run test:e2e            # E2E tests with Playwright
npm run test:coverage       # Coverage with HTML reports
npm run test:debug          # Debug test failures
```

### Test File Organization

```
{{SAMPLE_PATH}}/
├── tests/
│   ├── auth.test.ts        # Auth0 SPA SDK testing
│   ├── dom.test.ts         # DOM manipulation testing
│   ├── api.test.ts         # API interaction testing
│   ├── setup.ts            # Test setup and DOM configuration
│   ├── mocks/
│   │   ├── handlers.ts     # MSW handlers for Auth0 APIs
│   │   └── server.ts       # MSW server setup
│   └── utils/
│       └── dom-utils.ts    # DOM testing utilities
├── vitest.config.ts        # Vitest with jsdom environment
├── playwright.config.ts    # E2E testing configuration
└── package.json           # Test scripts configured
```

### SPA-Specific Testing Patterns

- **Auth0 SPA SDK**: Test SDK initialization and configuration
- **DOM Manipulation**: Test UI updates and event handling
- **State Management**: Test application state changes
- **Token Management**: Test token storage and refresh

### Common Test Scenarios

```typescript
// Example: Test SPA SDK initialization
describe('Auth0 SPA SDK', () => {
  it('should initialize with correct configuration', async () => {
    // Uses pre-configured jsdom environment
    // Leverages existing test scaffolding
  });
});
```

---

## Node.js Express Sample Apps

### Pre-Configured Infrastructure

- **Vitest**: Unit testing for Node.js
- **Supertest**: HTTP assertion testing
- **MSW**: Node.js API mocking
- **Coverage**: Node.js code coverage

### Testing Commands

```bash
cd {{SAMPLE_PATH}}
npm run test                # Run unit tests (vitest --run)
npm run test:watch          # Watch mode for development
npm run test:integration    # Integration tests with supertest
npm run test:coverage       # Coverage reports
npm run test:debug          # Debug test failures
```

### Test File Organization

```
{{SAMPLE_PATH}}/
├── tests/
│   ├── auth.test.ts        # Auth0 middleware testing
│   ├── routes.test.ts      # Express route testing
│   ├── middleware.test.ts  # Custom middleware testing
│   ├── setup.ts            # Test setup and server configuration
│   ├── mocks/
│   │   ├── handlers.ts     # MSW Node.js handlers
│   │   └── server.ts       # MSW server for Node.js
│   └── utils/
│       └── test-server.ts  # Test server utilities
├── vitest.config.ts        # Vitest Node.js configuration
└── package.json           # Test scripts configured
```

### Node.js-Specific Testing Patterns

- **Express Route Testing**: Test HTTP endpoints with supertest
- **Middleware Testing**: Test Auth0 middleware and custom middleware
- **Session Management**: Test server-side session handling
- **API Security**: Test protected endpoints and authorization

### Common Test Scenarios

```typescript
// Example: Test protected route
describe('Protected Routes', () => {
  it('should require authentication for protected endpoint', async () => {
    // Uses pre-configured supertest setup
    // Leverages existing MSW handlers
  });
});
```

---

## General Testing Workflow

### 1. Infrastructure Verification

Always start by verifying the testing infrastructure works:

```bash
cd {{SAMPLE_PATH}}
npm run test                # Should pass baseline tests
```

### 2. Issue Reproduction

Extend existing test files to reproduce specific issues:

- Follow existing test patterns and file organization
- Use pre-configured MSW handlers for Auth0 API mocking
- Add test cases to existing test suites rather than creating new files

### 3. Test Development

- **Extend existing scaffolding**: Don't create new test infrastructure
- **Use existing patterns**: Follow established conventions
- **Leverage pre-configured mocks**: Use existing MSW handlers
- **Follow existing reporting**: Use pre-configured test output directories

### 4. Validation and Reporting

- Run tests using pre-configured npm scripts
- Check coverage reports in standard locations
- Use existing test output for debugging and validation

## Best Practices

### DO:

- ✅ Use existing test scaffolding and patterns
- ✅ Extend existing test files with new test cases
- ✅ Use pre-configured MSW handlers for Auth0 API mocking
- ✅ Run tests via npm scripts (not direct vitest/playwright commands)
- ✅ Follow existing file organization and naming conventions

### DON'T:

- ❌ Create new vitest.config.ts or playwright.config.ts files
- ❌ Set up new test infrastructure from scratch
- ❌ Ignore existing test patterns and conventions
- ❌ Create duplicate test utilities or mock setups
- ❌ Bypass pre-configured test scripts and reporting
