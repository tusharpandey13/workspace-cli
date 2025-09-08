# NextJS Sample App Testing Infrastructure Setup Plan

**Sample App**: `auth0-nextjs-samples/Sample-01` (Next.js 13+ with App Router)

---

## 🎯 **SAMPLE APP ANALYSIS**

### **Expected Structure** (based on Auth0 NextJS samples):

```
auth0-nextjs-samples/Sample-01/
├── package.json                    # Next.js app with Auth0 SDK dependency
├── next.config.js                  # Next.js configuration
├── app/                            # App Router structure (Next.js 13+)
│   ├── layout.tsx                  # Root layout with UserProvider
│   ├── page.tsx                    # Home page
│   ├── profile/page.tsx            # Protected profile page
│   └── api/                        # API routes
│       ├── auth/[auth0]/route.ts   # Auth0 API route handler
│       └── protected/route.ts      # Protected API endpoint
├── components/                     # React components
│   ├── NavBar.tsx                  # Navigation with login/logout
│   └── ProfileCard.tsx             # User profile display
├── styles/                         # CSS/styling
└── public/                         # Static assets
```

### **Current Dependencies** (Expected):

```json
{
  "dependencies": {
    "@auth0/nextjs-auth0": "^3.0.0",
    "next": "^13.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🛠️ **TESTING INFRASTRUCTURE SETUP PLAN**

### **Phase 1: Testing Dependencies Installation**

**Dependencies to Add**:

```json
{
  "devDependencies": {
    // Core testing framework
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0",

    // React testing utilities
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",

    // Next.js testing integration
    "@vitejs/plugin-react": "^4.0.0",

    // E2E testing
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",

    // API mocking
    "msw": "^2.0.0",

    // Coverage reporting
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

### **Phase 2: Configuration Files Generation**

#### **2.1 Vitest Configuration** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/*.config.*', 'tests/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

#### **2.2 Playwright Configuration** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  outputDir: 'test-results/',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### **2.3 Test Setup File** (`tests/setup.ts`):

```typescript
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

### **Phase 3: Test File Scaffolding**

#### **3.1 MSW API Mocking Setup** (`tests/mocks/`):

**`tests/mocks/server.ts`**:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**`tests/mocks/handlers.ts`**:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Auth0 user endpoint
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: {
        sub: 'auth0|123456789',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg',
      },
    });
  }),

  // Mock protected API
  http.get('/api/protected', () => {
    return HttpResponse.json({
      message: 'This is a protected endpoint',
    });
  }),

  // Mock Auth0 login/logout
  http.get('/api/auth/login', () => {
    return new HttpResponse(null, { status: 302 });
  }),

  http.get('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 302 });
  }),
];
```

#### **3.2 Component Tests** (`tests/components/`):

**`tests/components/NavBar.test.tsx`**:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import NavBar from '../../components/NavBar'

describe('NavBar', () => {
  it('shows login button when user is not authenticated', () => {
    render(
      <UserProvider>
        <NavBar />
      </UserProvider>
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('shows logout button when user is authenticated', () => {
    // Mock authenticated user
    const mockUser = {
      sub: 'auth0|123',
      name: 'Test User',
      email: 'test@example.com'
    }

    render(
      <UserProvider user={mockUser}>
        <NavBar />
      </UserProvider>
    )

    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
})
```

**`tests/components/ProfileCard.test.tsx`**:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import ProfileCard from '../../components/ProfileCard'

describe('ProfileCard', () => {
  const mockUser = {
    sub: 'auth0|123',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/avatar.jpg'
  }

  it('renders user information correctly', () => {
    render(
      <UserProvider user={mockUser}>
        <ProfileCard />
      </UserProvider>
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', mockUser.picture)
  })

  it('shows loading state when user is undefined', () => {
    render(
      <UserProvider>
        <ProfileCard />
      </UserProvider>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

#### **3.3 API Route Tests** (`tests/api/`):

**`tests/api/protected.test.ts`**:

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '../../app/api/protected/route';
import { NextRequest } from 'next/server';

describe('/api/protected', () => {
  it('returns protected data when authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/protected', {
      headers: {
        cookie: 'appSession=mock-session-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('This is a protected endpoint');
  });

  it('returns 401 when not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/protected');

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

#### **3.4 Integration Tests** (`tests/integration/`):

**`tests/integration/auth-flow.test.tsx`**:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import Home from '../../app/page'

describe('Authentication Flow', () => {
  it('allows user to login and access protected content', async () => {
    const user = userEvent.setup()

    render(
      <UserProvider>
        <Home />
      </UserProvider>
    )

    // Initially shows login button
    expect(screen.getByText('Login')).toBeInTheDocument()

    // Click login button
    await user.click(screen.getByText('Login'))

    // Should redirect to Auth0 (mocked)
    await waitFor(() => {
      expect(window.location.href).toContain('/api/auth/login')
    })
  })
})
```

#### **3.5 E2E Tests** (`tests/e2e/`):

**`tests/e2e/auth-flow.spec.ts`**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete login and logout flow', async ({ page }) => {
    await page.goto('/');

    // Check initial state
    await expect(page.getByText('Login')).toBeVisible();

    // Click login
    await page.getByText('Login').click();

    // Should redirect to Auth0 login page (in real scenario)
    // For testing, we can mock this or use Auth0's test tenant
    await expect(page.url()).toContain('/api/auth/login');
  });

  test('protected pages require authentication', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page.url()).toContain('/api/auth/login');
  });
});
```

### **Phase 4: Package.json Scripts Update**

**Scripts to Add**:

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage --run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:debug": "vitest --inspect-brk --no-coverage",
    "test:setup": "playwright install"
  }
}
```

### **Phase 5: Directory Structure Creation**

**Directories to Create**:

```
tests/
├── setup.ts                       # Test setup configuration
├── mocks/                          # MSW API mocking
│   ├── server.ts                   # MSW server setup
│   └── handlers.ts                 # API route mocks
├── components/                     # Component tests
│   ├── NavBar.test.tsx
│   └── ProfileCard.test.tsx
├── api/                           # API route tests
│   └── protected.test.ts
├── integration/                   # Integration tests
│   └── auth-flow.test.tsx
└── e2e/                          # End-to-end tests
    └── auth-flow.spec.ts

test-results/                     # Playwright output
coverage/                         # Coverage reports
```

---

## ✅ **VALIDATION CHECKLIST**

- [ ] All testing dependencies installed
- [ ] Vitest configuration working with React components
- [ ] Playwright configuration with proper Next.js dev server setup
- [ ] MSW handlers mocking Auth0 API endpoints
- [ ] Component tests for NavBar and ProfileCard
- [ ] API route tests for protected endpoints
- [ ] Integration tests for authentication flow
- [ ] E2E tests for complete user journeys
- [ ] Coverage reporting configured
- [ ] All test scripts added to package.json

---

## 🎯 **SUCCESS CRITERIA**

1. **Zero Setup Time**: Developers can immediately run tests without configuration
2. **Comprehensive Coverage**: Auth0 authentication flows, API routes, and UI components tested
3. **Real-world Scenarios**: Tests cover actual Auth0 SDK usage patterns
4. **CI-Ready**: All tests can run in automated environments
5. **Development-Friendly**: Watch mode and UI tools available for development

---

## 📝 **NOTES**

- **Auth0 Specific Testing**: Focus on authentication flows, session management, and protected routes
- **Next.js App Router**: Tests account for new App Router patterns (layout, route handlers)
- **MSW Integration**: API mocking handles Auth0 endpoints and custom API routes
- **TypeScript Support**: All test files use TypeScript for type safety
- **Performance**: Fast test execution with appropriate mocking strategies
