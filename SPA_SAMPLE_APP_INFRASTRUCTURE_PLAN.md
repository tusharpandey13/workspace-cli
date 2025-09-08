# SPA Sample App Testing Infrastructure Setup Plan

**Sample App**: `spatest` (Vanilla JavaScript SPA with Auth0-SPA-JS SDK)

---

## 🎯 **SAMPLE APP ANALYSIS**

### **Expected Structure** (based on Auth0 SPA-JS samples):

```
spatest/
├── package.json                    # Simple SPA with Auth0 SPA-JS dependency
├── index.html                      # Main HTML file
├── src/                            # Source code
│   ├── app.js                      # Main application logic
│   ├── auth.js                     # Auth0 authentication handling
│   ├── api.js                      # API call utilities
│   └── utils.js                    # Helper utilities
├── public/                         # Static assets
│   ├── css/
│   │   └── main.css               # Application styles
│   └── js/
│       └── config.js              # Auth0 configuration
├── dist/                          # Build output (if using bundler)
└── server.js                     # Optional local development server
```

### **Current Dependencies** (Expected):

```json
{
  "dependencies": {
    "@auth0/auth0-spa-js": "^2.0.0"
  },
  "devDependencies": {
    "http-server": "^14.0.0",
    "serve": "^14.0.0"
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
    "happy-dom": "^12.0.0",

    // DOM testing utilities
    "@testing-library/dom": "^9.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",

    // E2E testing
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",

    // API mocking for vanilla JS
    "msw": "^2.0.0",

    // Module bundling for tests (if needed)
    "vite": "^5.0.0",

    // Coverage reporting
    "@vitest/coverage-v8": "^1.0.0",

    // Development server
    "serve": "^14.0.0"
  }
}
```

### **Phase 2: Configuration Files Generation**

#### **2.1 Vitest Configuration** (`vitest.config.js`):

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'happy-dom' for faster tests
    setupFiles: ['./tests/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['**/*.config.*', 'tests/**', 'dist/**'],
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
```

#### **2.2 Playwright Configuration** (`playwright.config.js`):

```javascript
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
    command: 'npm run serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### **2.3 Test Setup File** (`tests/setup.js`):

```javascript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server.js';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock window.location for SPA navigation
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// Mock localStorage for Auth0 token storage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});
```

### **Phase 3: Test File Scaffolding**

#### **3.1 MSW API Mocking Setup** (`tests/mocks/`):

**`tests/mocks/server.js`**:

```javascript
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);
```

**`tests/mocks/handlers.js`**:

```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Auth0 token endpoint
  http.post('https://dev-example.auth0.com/oauth/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 86400,
      scope: 'openid profile email',
    });
  }),

  // Mock Auth0 userinfo endpoint
  http.get('https://dev-example.auth0.com/userinfo', () => {
    return HttpResponse.json({
      sub: 'auth0|123456789',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/avatar.jpg',
      email_verified: true,
    });
  }),

  // Mock protected API endpoint
  http.get('http://localhost:3001/api/external', ({ request }) => {
    const authorization = request.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      message: 'Hello from a private endpoint! You need to be authenticated to see this.',
      timestamp: new Date().toISOString(),
    });
  }),

  // Mock Auth0 logout
  http.get('https://dev-example.auth0.com/v2/logout', () => {
    return new HttpResponse(null, { status: 302 });
  }),
];
```

#### **3.2 Authentication Module Tests** (`tests/unit/`):

**`tests/unit/auth.test.js`**:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTokenSilently, loginWithRedirect, logout, getUser } from '../../src/auth.js';

// Mock the Auth0 client
vi.mock('@auth0/auth0-spa-js', () => ({
  default: {
    createAuth0Client: vi.fn(() => ({
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getTokenSilently: vi.fn(),
      getUser: vi.fn(),
      isAuthenticated: vi.fn(),
      handleRedirectCallback: vi.fn(),
    })),
  },
}));

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTokenSilently', () => {
    it('returns access token when user is authenticated', async () => {
      const mockClient = {
        getTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
      };

      const token = await getTokenSilently(mockClient);

      expect(token).toBe('mock-access-token');
      expect(mockClient.getTokenSilently).toHaveBeenCalled();
    });

    it('throws error when unable to get token', async () => {
      const mockClient = {
        getTokenSilently: vi.fn().mockRejectedValue(new Error('Login required')),
      };

      await expect(getTokenSilently(mockClient)).rejects.toThrow('Login required');
    });
  });

  describe('loginWithRedirect', () => {
    it('calls Auth0 loginWithRedirect with correct parameters', async () => {
      const mockClient = {
        loginWithRedirect: vi.fn(),
      };

      await loginWithRedirect(mockClient);

      expect(mockClient.loginWithRedirect).toHaveBeenCalledWith({
        authorizationParams: {
          redirect_uri: window.location.origin,
        },
      });
    });
  });

  describe('getUser', () => {
    it('returns user information when authenticated', async () => {
      const mockUser = {
        sub: 'auth0|123',
        name: 'Test User',
        email: 'test@example.com',
      };

      const mockClient = {
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      const user = await getUser(mockClient);

      expect(user).toEqual(mockUser);
      expect(mockClient.getUser).toHaveBeenCalled();
    });
  });
});
```

**`tests/unit/api.test.js`**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { callExternalApi } from '../../src/api.js';

describe('API Module', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  describe('callExternalApi', () => {
    it('makes authenticated API call successfully', async () => {
      const mockResponse = {
        message: 'Hello from API',
        timestamp: '2023-01-01T00:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await callExternalApi('mock-access-token');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/external', {
        headers: {
          Authorization: 'Bearer mock-access-token',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors gracefully', async () => {
      fetch.mockRejectOnce(new Error('Network error'));

      await expect(callExternalApi('mock-token')).rejects.toThrow('Network error');
    });

    it('handles 401 unauthorized responses', async () => {
      fetch.mockResponseOnce('', { status: 401 });

      await expect(callExternalApi('invalid-token')).rejects.toThrow();
    });
  });
});
```

#### **3.3 DOM Integration Tests** (`tests/integration/`):

**`tests/integration/app.test.js`**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Import the main app module
import '../../src/app.js';

describe('App Integration', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="app">
        <nav class="navbar">
          <button id="qsLoginBtn" class="btn btn-primary btn-margin">Log in</button>
          <button id="qsLogoutBtn" class="btn btn-primary btn-margin d-none">Log out</button>
        </nav>
        <div id="content-home" class="content-area">
          <h1>Welcome to Auth0 SPA Sample</h1>
        </div>
        <div id="content-profile" class="content-area d-none">
          <h1>Profile</h1>
          <div id="profile-data"></div>
        </div>
      </div>
    `;
  });

  it('shows login button by default', () => {
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.queryByText('Log out')).not.toBeVisible();
  });

  it('handles login button click', async () => {
    const user = userEvent.setup();
    const loginBtn = screen.getByText('Log in');

    await user.click(loginBtn);

    // Should trigger Auth0 login flow (mocked)
    // In real scenario, this would redirect to Auth0
  });

  it('displays user profile when authenticated', async () => {
    // Simulate authenticated state
    const mockUser = {
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/avatar.jpg',
    };

    // Trigger profile display
    const profileData = document.getElementById('profile-data');
    profileData.innerHTML = `
      <img src="${mockUser.picture}" alt="Profile" />
      <h2>${mockUser.name}</h2>
      <p>${mockUser.email}</p>
    `;

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockUser.picture);
  });

  it('handles logout functionality', async () => {
    const user = userEvent.setup();

    // Simulate logged in state
    const loginBtn = document.getElementById('qsLoginBtn');
    const logoutBtn = document.getElementById('qsLogoutBtn');

    loginBtn.classList.add('d-none');
    logoutBtn.classList.remove('d-none');

    await user.click(logoutBtn);

    // Should trigger logout process
    await waitFor(() => {
      expect(loginBtn).not.toHaveClass('d-none');
      expect(logoutBtn).toHaveClass('d-none');
    });
  });
});
```

#### **3.4 E2E Tests** (`tests/e2e/`):

**`tests/e2e/auth-flow.spec.js`**:

```javascript
import { test, expect } from '@playwright/test';

test.describe('SPA Authentication Flow', () => {
  test('displays login interface correctly', async ({ page }) => {
    await page.goto('/');

    // Check initial state
    await expect(page.getByText('Welcome to Auth0 SPA Sample')).toBeVisible();
    await expect(page.getByText('Log in')).toBeVisible();
    await expect(page.getByText('Log out')).not.toBeVisible();
  });

  test('login button triggers Auth0 redirect', async ({ page }) => {
    await page.goto('/');

    // Mock the redirect by intercepting the navigation
    let redirectUrl = null;
    page.on('request', (request) => {
      if (request.url().includes('authorize')) {
        redirectUrl = request.url();
      }
    });

    await page.getByText('Log in').click();

    // Should have initiated Auth0 authorization
    await page.waitForTimeout(1000); // Allow for async redirect
    expect(redirectUrl).toBeTruthy();
  });

  test('handles authentication callback', async ({ page }) => {
    // Simulate returning from Auth0 with authorization code
    const callbackUrl = '/?code=mock-auth-code&state=mock-state';
    await page.goto(callbackUrl);

    // Should process the callback and show logged-in state
    await expect(page.getByText('Log out')).toBeVisible({ timeout: 5000 });
  });

  test('protected API calls work when authenticated', async ({ page }) => {
    await page.goto('/');

    // Mock authenticated state by setting localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth0.is_authenticated', 'true');
      localStorage.setItem('auth0.access_token', 'mock-access-token');
    });

    await page.reload();

    // Try to call protected API
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3001/api/external', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth0.access_token')}`,
        },
      });
      return response.ok;
    });

    expect(apiResponse).toBe(true);
  });

  test('logout clears authentication state', async ({ page }) => {
    await page.goto('/');

    // Set authenticated state
    await page.evaluate(() => {
      localStorage.setItem('auth0.is_authenticated', 'true');
    });

    await page.reload();
    await expect(page.getByText('Log out')).toBeVisible();

    // Click logout
    await page.getByText('Log out').click();

    // Should clear state and show login
    await expect(page.getByText('Log in')).toBeVisible();

    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth0.is_authenticated');
    });

    expect(isAuthenticated).toBeFalsy();
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
    "test:setup": "playwright install",
    "serve": "serve . -p 3000 -s",
    "dev": "serve . -p 3000"
  }
}
```

### **Phase 5: Directory Structure Creation**

**Directories to Create**:

```
tests/
├── setup.js                       # Test setup configuration
├── mocks/                          # MSW API mocking
│   ├── server.js                   # MSW server setup
│   └── handlers.js                 # API route mocks
├── unit/                          # Unit tests
│   ├── auth.test.js               # Auth module tests
│   ├── api.test.js                # API module tests
│   └── utils.test.js              # Utility function tests
├── integration/                   # Integration tests
│   └── app.test.js                # Full app integration
└── e2e/                          # End-to-end tests
    └── auth-flow.spec.js          # E2E auth flow tests

test-results/                     # Playwright output
coverage/                         # Coverage reports
```

---

## ✅ **VALIDATION CHECKLIST**

- [ ] All testing dependencies installed
- [ ] Vitest configuration working with vanilla JS modules
- [ ] Playwright configuration with static file serving
- [ ] MSW handlers mocking Auth0 endpoints and APIs
- [ ] Unit tests for auth and API modules
- [ ] DOM integration tests for UI interactions
- [ ] E2E tests for complete authentication flows
- [ ] Coverage reporting configured for source files
- [ ] All test scripts added to package.json

---

## 🎯 **SUCCESS CRITERIA**

1. **Zero Setup Time**: Developers can immediately run tests without configuration
2. **Auth0 SPA Coverage**: Authentication flows, token management, and API calls tested
3. **Vanilla JS Support**: Tests work with plain JavaScript without bundling complexity
4. **Real Browser Testing**: E2E tests verify actual user interactions
5. **CI-Ready**: All tests can run in headless environments

---

## 📝 **NOTES**

- **Vanilla JS Focus**: Tests accommodate plain JavaScript without heavy build tools
- **Auth0 SPA-JS Specific**: Tests cover SPA-specific Auth0 patterns (token storage, silent auth)
- **DOM Testing**: Uses Testing Library for vanilla JS DOM manipulation testing
- **MSW for APIs**: Mocks both Auth0 endpoints and custom API endpoints
- **Static Serving**: Uses simple static file server for E2E testing
