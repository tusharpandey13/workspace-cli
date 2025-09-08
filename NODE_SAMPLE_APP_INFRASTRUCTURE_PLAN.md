# Node.js Sample App Testing Infrastructure Setup Plan

**Sample App**: `node-auth0-client` (Node.js Express app with Auth0 Node.js SDK)

---

## 🎯 **SAMPLE APP ANALYSIS**

### **Expected Structure** (based on Auth0 Node.js samples):

```
node-auth0-client/
├── package.json                    # Express app with Auth0 Node.js SDK dependency
├── app.js                          # Main Express application
├── server.js                       # Server startup file
├── routes/                         # Express routes
│   ├── index.js                    # Home route
│   ├── auth.js                     # Authentication routes
│   ├── profile.js                  # Protected profile route
│   └── api.js                      # API endpoints
├── middleware/                     # Custom middleware
│   ├── auth.js                     # Authentication middleware
│   └── error.js                    # Error handling middleware
├── config/                         # Configuration files
│   └── auth0.js                    # Auth0 configuration
├── views/                          # Template files (if using templating)
│   ├── index.ejs
│   ├── profile.ejs
│   └── layout.ejs
├── public/                         # Static assets
│   ├── css/
│   └── js/
└── .env                           # Environment variables
```

### **Current Dependencies** (Expected):

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "express-openid-connect": "^2.17.0",
    "dotenv": "^16.0.0",
    "ejs": "^3.1.0",
    "express-session": "^1.17.0",
    "cors": "^2.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
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

    // HTTP testing utilities
    "supertest": "^6.3.0",

    // API mocking for Node.js
    "msw": "^2.0.0",
    "@mswjs/interceptors": "^0.25.0",

    // Test utilities
    "cross-env": "^7.0.3",

    // Coverage reporting
    "@vitest/coverage-v8": "^1.0.0",

    // Development tools
    "nodemon": "^3.0.0"
  }
}
```

### **Phase 2: Configuration Files Generation**

#### **2.1 Vitest Configuration** (`vitest.config.js`):

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app.js', 'server.js', 'routes/**/*.js', 'middleware/**/*.js', 'config/**/*.js'],
      exclude: ['tests/**', 'node_modules/**', 'public/**', 'views/**'],
    },
    testTimeout: 10000, // Longer timeout for integration tests
  },
});
```

#### **2.2 Test Environment Configuration** (`tests/setup.js`):

```javascript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server.js';

// Setup MSW for Node.js
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH0_SECRET = 'test-secret-key-minimum-32-characters-long';
process.env.AUTH0_BASE_URL = 'http://localhost:3000';
process.env.AUTH0_CLIENT_ID = 'test-client-id';
process.env.AUTH0_ISSUER_BASE_URL = 'https://dev-test.auth0.com';

// Mock console.log for cleaner test output
if (process.env.CI) {
  global.console = {
    ...console,
    log: () => {},
    info: () => {},
    debug: () => {},
  };
}
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
  http.post('https://dev-test.auth0.com/oauth/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 86400,
      scope: 'openid profile email',
    });
  }),

  // Mock Auth0 userinfo endpoint
  http.get('https://dev-test.auth0.com/userinfo', ({ request }) => {
    const authorization = request.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      sub: 'auth0|123456789',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/avatar.jpg',
      email_verified: true,
    });
  }),

  // Mock Auth0 JWKS endpoint
  http.get('https://dev-test.auth0.com/.well-known/jwks.json', () => {
    return HttpResponse.json({
      keys: [
        {
          kty: 'RSA',
          kid: 'test-key-id',
          use: 'sig',
          n: 'mock-modulus',
          e: 'AQAB',
        },
      ],
    });
  }),

  // Mock external API endpoint
  http.get('https://api.example.com/data', ({ request }) => {
    const authorization = request.headers.get('Authorization');

    if (!authorization) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      message: 'Hello from external API',
      timestamp: new Date().toISOString(),
      data: ['item1', 'item2', 'item3'],
    });
  }),
];
```

#### **3.2 Route Tests** (`tests/routes/`):

**`tests/routes/auth.test.js`**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { auth } from 'express-openid-connect';
import authRoutes from '../../routes/auth.js';

const createTestApp = () => {
  const app = express();

  // Mock Auth0 configuration for testing
  app.use(
    auth({
      authRequired: false,
      auth0Logout: true,
      secret: process.env.AUTH0_SECRET,
      baseURL: process.env.AUTH0_BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    }),
  );

  app.use('/', authRoutes);

  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /login', () => {
    it('redirects to Auth0 login page', async () => {
      const response = await request(app).get('/login').expect(302);

      expect(response.headers.location).toContain('auth0.com');
      expect(response.headers.location).toContain('authorize');
    });
  });

  describe('GET /logout', () => {
    it('redirects to Auth0 logout and clears session', async () => {
      const response = await request(app).get('/logout').expect(302);

      expect(response.headers.location).toContain('auth0.com');
      expect(response.headers.location).toContain('logout');
    });
  });

  describe('GET /callback', () => {
    it('handles Auth0 callback successfully', async () => {
      const response = await request(app)
        .get('/callback?code=test-code&state=test-state')
        .expect(302);

      // Should redirect to home page after successful authentication
      expect(response.headers.location).toBe('/');
    });

    it('handles callback errors gracefully', async () => {
      const response = await request(app)
        .get('/callback?error=access_denied&error_description=User%20denied%20access')
        .expect(302);

      // Should redirect to error page or home with error
      expect(response.headers.location).toBeDefined();
    });
  });
});
```

**`tests/routes/profile.test.js`**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { auth, requiresAuth } from 'express-openid-connect';
import profileRoutes from '../../routes/profile.js';

const createTestApp = (isAuthenticated = false) => {
  const app = express();

  // Mock authentication middleware
  app.use((req, res, next) => {
    if (isAuthenticated) {
      req.oidc = {
        isAuthenticated: () => true,
        user: {
          sub: 'auth0|123456789',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.jpg',
        },
      };
    } else {
      req.oidc = {
        isAuthenticated: () => false,
        user: null,
      };
    }
    next();
  });

  app.use('/', profileRoutes);

  return app;
};

describe('Profile Routes', () => {
  describe('GET /profile', () => {
    it('returns profile page for authenticated user', async () => {
      const app = createTestApp(true);

      const response = await request(app).get('/profile').expect(200);

      expect(response.text).toContain('Test User');
      expect(response.text).toContain('test@example.com');
    });

    it('redirects to login for unauthenticated user', async () => {
      const app = createTestApp(false);

      const response = await request(app).get('/profile').expect(302);

      expect(response.headers.location).toContain('/login');
    });
  });

  describe('GET /profile/api', () => {
    it('returns user data as JSON for authenticated user', async () => {
      const app = createTestApp(true);

      const response = await request(app)
        .get('/profile/api')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        sub: 'auth0|123456789',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg',
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      const app = createTestApp(false);

      await request(app).get('/profile/api').expect(401);
    });
  });
});
```

**`tests/routes/api.test.js`**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../../routes/api.js';

const createTestApp = (isAuthenticated = false) => {
  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, res, next) => {
    if (isAuthenticated) {
      req.oidc = {
        isAuthenticated: () => true,
        accessToken: {
          access_token: 'mock-access-token',
        },
      };
    } else {
      req.oidc = {
        isAuthenticated: () => false,
        accessToken: null,
      };
    }
    next();
  });

  app.use('/api', apiRoutes);

  return app;
};

describe('API Routes', () => {
  describe('GET /api/external', () => {
    it('returns external API data for authenticated user', async () => {
      const app = createTestApp(true);

      const response = await request(app)
        .get('/api/external')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.message).toBe('Hello from external API');
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('returns 401 for unauthenticated user', async () => {
      const app = createTestApp(false);

      await request(app).get('/api/external').expect(401);
    });
  });

  describe('POST /api/data', () => {
    it('processes data submission for authenticated user', async () => {
      const app = createTestApp(true);
      const testData = { name: 'Test Item', value: 42 };

      const response = await request(app)
        .post('/api/data')
        .send(testData)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body.message).toBe('Data created successfully');
      expect(response.body.data).toEqual(testData);
    });

    it('validates required fields', async () => {
      const app = createTestApp(true);

      await request(app)
        .post('/api/data')
        .send({}) // Empty data
        .expect(400);
    });
  });
});
```

#### **3.3 Middleware Tests** (`tests/middleware/`):

**`tests/middleware/auth.test.js`**:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { requiresAuth, requiresScope } from '../../middleware/auth.js';

describe('Auth Middleware', () => {
  describe('requiresAuth', () => {
    it('allows authenticated requests to continue', () => {
      const req = {
        oidc: {
          isAuthenticated: () => true,
        },
      };
      const res = {};
      const next = vi.fn();

      requiresAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('redirects unauthenticated requests to login', () => {
      const req = {
        oidc: {
          isAuthenticated: () => false,
        },
      };
      const res = {
        redirect: vi.fn(),
      };
      const next = vi.fn();

      requiresAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requiresScope', () => {
    it('allows requests with required scope', () => {
      const middleware = requiresScope('read:data');
      const req = {
        oidc: {
          isAuthenticated: () => true,
          accessToken: {
            scope: 'read:data write:data',
          },
        },
      };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('denies requests without required scope', () => {
      const middleware = requiresScope('admin:users');
      const req = {
        oidc: {
          isAuthenticated: () => true,
          accessToken: {
            scope: 'read:data',
          },
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient scope' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
```

#### **3.4 Integration Tests** (`tests/integration/`):

**`tests/integration/app.test.js`**:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('App Integration Tests', () => {
  describe('GET /', () => {
    it('returns home page', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.text).toContain('Welcome');
    });
  });

  describe('Authentication flow', () => {
    it('handles complete authentication flow', async () => {
      // Start at home page
      let response = await request(app).get('/').expect(200);

      // Attempt to access protected resource
      response = await request(app).get('/profile').expect(302); // Should redirect to login

      expect(response.headers.location).toContain('/login');
    });
  });

  describe('API endpoints', () => {
    it('handles API requests correctly', async () => {
      const response = await request(app)
        .get('/api/public')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('handles 404 errors gracefully', async () => {
      await request(app).get('/nonexistent-route').expect(404);
    });

    it('handles server errors gracefully', async () => {
      // This would test error middleware
      // Implementation depends on your error handling setup
    });
  });
});
```

#### **3.5 E2E Tests with Supertest** (`tests/e2e/`):

**`tests/e2e/full-flow.test.js`**:

```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('End-to-End Authentication Flow', () => {
  it('completes full authentication and API access flow', async () => {
    const agent = request.agent(app);

    // 1. Access home page
    let response = await agent.get('/').expect(200);

    // 2. Attempt to access protected profile (should redirect)
    response = await agent.get('/profile').expect(302);

    expect(response.headers.location).toContain('/login');

    // 3. Initiate login (should redirect to Auth0)
    response = await agent.get('/login').expect(302);

    expect(response.headers.location).toContain('auth0.com');

    // 4. Simulate Auth0 callback with authorization code
    // Note: In real E2E tests, you would use browser automation
    response = await agent.get('/callback?code=mock-auth-code&state=mock-state').expect(302);

    // 5. Should now be able to access protected resources
    // This would require proper session handling in tests
  });

  it('handles API authentication end-to-end', async () => {
    const agent = request.agent(app);

    // Try to access protected API without authentication
    await agent.get('/api/protected').expect(401);

    // After authentication (mocked), should be able to access
    // This would require setting up proper test authentication
  });

  it('handles logout flow completely', async () => {
    const agent = request.agent(app);

    // Simulate authenticated session
    // Access logout endpoint
    const response = await agent.get('/logout').expect(302);

    expect(response.headers.location).toContain('auth0.com');
    expect(response.headers.location).toContain('logout');

    // After logout, should not be able to access protected resources
    await agent.get('/profile').expect(302); // Should redirect to login again
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
    "test:integration": "vitest --run tests/integration",
    "test:e2e": "vitest --run tests/e2e",
    "test:unit": "vitest --run tests/routes tests/middleware",
    "test:debug": "vitest --inspect-brk --no-coverage",
    "dev": "nodemon server.js",
    "start": "node server.js",
    "start:test": "cross-env NODE_ENV=test node server.js"
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
├── routes/                         # Route tests
│   ├── auth.test.js                # Authentication routes
│   ├── profile.test.js             # Profile routes
│   ├── api.test.js                 # API endpoints
│   └── index.test.js               # Home routes
├── middleware/                     # Middleware tests
│   ├── auth.test.js                # Auth middleware
│   └── error.test.js               # Error handling middleware
├── integration/                    # Integration tests
│   └── app.test.js                 # Full app integration
└── e2e/                           # End-to-end tests
    └── full-flow.test.js           # Complete user flows

coverage/                          # Coverage reports
```

---

## ✅ **VALIDATION CHECKLIST**

- [ ] All testing dependencies installed
- [ ] Vitest configuration working with Node.js environment
- [ ] MSW handlers mocking Auth0 and external APIs
- [ ] Route tests for all authentication and API endpoints
- [ ] Middleware tests for authentication and authorization
- [ ] Integration tests for complete app functionality
- [ ] E2E tests using supertest for full flows
- [ ] Coverage reporting configured for server-side code
- [ ] All test scripts added to package.json

---

## 🎯 **SUCCESS CRITERIA**

1. **Zero Setup Time**: Developers can immediately run tests without configuration
2. **Auth0 Node.js Coverage**: Express-openid-connect patterns, middleware, and API protection tested
3. **Supertest Integration**: HTTP testing covers all routes and middleware
4. **MSW API Mocking**: External API calls and Auth0 endpoints properly mocked
5. **CI-Ready**: All tests can run in automated Node.js environments

---

## 📝 **NOTES**

- **Express-openid-connect Focus**: Tests accommodate Auth0's Express middleware patterns
- **Supertest for HTTP**: Primary testing tool for Express route and middleware testing
- **MSW for External APIs**: Mocks Auth0 endpoints and any external API dependencies
- **Session Testing**: Proper handling of authentication state across requests
- **Error Scenarios**: Comprehensive testing of authentication failures and edge cases
