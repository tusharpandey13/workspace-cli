{panel:title=Space CLI for Auth0 Monorepo Development|borderStyle=solid|borderColor=#0052CC|titleBGColor=#E6F3FF}
_End context switching pain in Auth0 monorepos with automated git worktrees_

**Space CLI** is a stack-agnostic workspace automation tool specifically optimized for Auth0's multi-SDK development ecosystem. It creates isolated, feature-focused development environments using git worktrees, eliminating the need for multiple repository clones while providing intelligent automation for Auth0 SDK development.
{panel}

---

## 🎯 Why Space CLI for Auth0?

{info:title=Problem Statement}
Auth0 maintains **17 different SDKs** across multiple technology stacks (Web, Mobile, Server, Infrastructure). Traditional development workflows create challenges:

- **Context switching overhead** between different SDK repositories
- **Disk space waste** from multiple repository clones
- **Inconsistent development environments** across different SDKs
- **Manual setup complexity** for testing SDK changes against sample applications
- **Lost development context** when switching between issues/PRs
  {info}

{tip:title=Space CLI Solution}
✅ **Feature-focused directories**: `/src/workspaces/auth0-nextjs/feat/sso/` instead of project-focused  
✅ **Git worktree efficiency**: ~70% less disk usage, shared git history  
✅ **AI-powered automation**: Context fetching, template generation, environment setup  
✅ **Zero-config Auth0 setup**: All 17 Auth0 SDKs pre-configured  
✅ **Intelligent sample app integration**: Automatic sample app pairing with SDKs  
{tip}

---

## 🚀 Quick Start for Auth0 Teams

### Installation

```bash
pnpm add -g @tusharpandey13/space-cli
```

### Immediate Auth0 SDK Development

{code:language=bash}

# Create a feature workspace for Next.js Auth0 SDK

space init nextjs-auth0 feat/silent-auth-improvements

# Create a PR-based workspace (auto-fetches GitHub context)

space init auth0-react --pr 1234 review/react-hook-fixes

# Create workspace with multiple GitHub context IDs

space init node-auth0 456 789 feature/management-api-v3
{code}

{warning:title=Prerequisites}

- **Node.js** v18+
- **GitHub CLI** ([install guide](https://cli.github.com/))
- **Git** v2.25+ (for worktree support)
- **pnpm** (recommended) or npm
  {warning}

---

## 📊 Auth0 SDK Compatibility Matrix

Space CLI comes **pre-configured** with all Auth0 SDK repositories. No additional configuration required.

### Web SDKs

| Project Key     | Repository                                              | Sample Repository                                                               | Tech Stack | Post-Init Commands |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- | ------------------ |
| `auth0-spa-js`  | [auth0-spa-js](https://github.com/auth0/auth0-spa-js)   | [spa-js-samples](https://github.com/tusharpandey13/auth0-spa-js-sample)         | Vanilla JS | npm install        |
| `auth0-react`   | [auth0-react](https://github.com/auth0/auth0-react)     | [react-samples](https://github.com/auth0-samples/auth0-react-samples)           | React      | npm install        |
| `nextjs-auth0`  | [nextjs-auth0](https://github.com/auth0/nextjs-auth0)   | [nextjs-samples](https://github.com/auth0-samples/auth0-nextjs-samples)         | Next.js    | pnpm install       |
| `auth0-angular` | [auth0-angular](https://github.com/auth0/auth0-angular) | [angular-samples](https://github.com/auth0-samples/auth0-angular-samples)       | Angular    | npm install        |
| `auth0-vue`     | [auth0-vue](https://github.com/auth0/auth0-vue)         | [vue-samples](https://github.com/auth0-samples/auth0-vue-samples)               | Vue.js     | npm install        |
| `lock`          | [lock](https://github.com/auth0/lock)                   | [javascript-samples](https://github.com/auth0-samples/auth0-javascript-samples) | JavaScript | npm install        |

### Server SDKs

| Project Key              | Repository                                                                | Sample Repository                                                                      | Tech Stack | Post-Init Commands |
| ------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- | ------------------ |
| `node-auth0`             | [node-auth0](https://github.com/auth0/node-auth0)                         | [nodejs-samples](https://github.com/auth0-samples/auth0-nodejs-samples)                | Node.js    | npm install        |
| `express-openid-connect` | [express-openid-connect](https://github.com/auth0/express-openid-connect) | [express-samples](https://github.com/auth0-samples/auth0-express-webapp-sample)        | Express.js | npm install        |
| `auth0-java`             | [auth0-java](https://github.com/auth0/auth0-java)                         | [spring-mvc-sample](https://github.com/auth0-samples/auth0-spring-security-mvc-sample) | Java       | ./gradlew build    |
| `java-jwt`               | [java-jwt](https://github.com/auth0/java-jwt)                             | [java-samples](https://github.com/auth0-samples/auth0-java-samples)                    | Java JWT   | ./gradlew build    |
| `jwks-rsa-java`          | [jwks-rsa-java](https://github.com/auth0/jwks-rsa-java)                   | [spring-mvc-sample](https://github.com/auth0-samples/auth0-spring-security-mvc-sample) | Java JWKS  | ./gradlew build    |

### Mobile & Infrastructure SDKs

| Project Key                | Repository                                                                    | Sample Repository                                                                 | Tech Stack   | Post-Init Commands |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------ | ------------------ |
| `react-native-auth0`       | [react-native-auth0](https://github.com/auth0/react-native-auth0)             | [react-native-sample](https://github.com/auth0-samples/auth0-react-native-sample) | React Native | npm install        |
| `terraform-provider-auth0` | [terraform-provider-auth0](https://github.com/auth0/terraform-provider-auth0) | [terraform-provider-auth0](https://github.com/auth0/terraform-provider-auth0)     | Terraform    | go mod download    |
| `wordpress`                | [wordpress](https://github.com/auth0/wordpress)                               | [wordpress](https://github.com/auth0/wordpress)                                   | WordPress    | composer install   |

---

## 🏗️ Workspace Structure for Auth0 Development

When you run `space init nextjs-auth0 feat/silent-auth`, it creates:

{code:language=bash}
~/src/workspaces/nextjs-auth0/feat/silent-auth/
├── nextjs-auth0/ # Main SDK repository (your feature branch)
│ ├── src/
│ ├── tests/
│ └── package.json
├── auth0-nextjs-samples/ # Sample app repository (default branch)
│ ├── Sample-01/
│ ├── Sample-02/
│ └── ...
├── .env.local # Environment configuration (auto-copied)
├── .github/
│ └── copilot-instructions.md # AI development guidelines
├── analysis.prompt.md # Structured analysis template
├── fix-and-test.prompt.md # SDK-sample feedback loop template
├── review-changes.prompt.md # Code review template
├── PR_DESCRIPTION_TEMPLATE.md # Enhanced PR description template
└── CONTEXT.md # Auto-fetched GitHub context
{code}

{note:title=Key Benefits}

- **SDK Repository**: Checked out to your feature branch for development
- **Sample Apps**: Always on default branch for testing compatibility
- **Environment Files**: Pre-configured Auth0 environment templates
- **AI Templates**: Context-aware development workflow guidance
- **GitHub Context**: Automatically fetched issue/PR details and comments
  {note}

---

## 🤖 AI-Powered Auth0 Development Workflow

### Smart Context Fetching

{code:language=bash}

# Automatically fetches GitHub issue context

space init auth0-react --pr 1234 bugfix/hooks-memory-leak

# Creates CONTEXT.md with:

# - PR description and comments

# - Linked issues and related PRs

# - Referenced documentation (from safe domains)

# - Discussion threads and review feedback

{code}

### Copilot Integration

Every workspace includes `.github/copilot-instructions.md` with:

- **Auth0 SDK architecture patterns** and conventions
- **Testing methodologies** specific to each SDK
- **Common gotchas** and troubleshooting guides
- **Performance optimization** patterns
- **Sample app integration** strategies

### Development Templates

{panel:title=4 Structured Templates for Auth0 Development}

1. **Analysis Templates** - Problem analysis with validation questions
2. **Implementation Templates** - Step-by-step development with testing guidance
3. **Review Templates** - Structured code review with Auth0 security patterns
4. **PR Templates** - Enhanced pull request descriptions with validation requirements
   {panel}

---

## 💼 Real-World Auth0 Use Cases

### Use Case 1: Cross-SDK Feature Development

{code:language=bash}

# Working on OAuth2 refresh token improvements across multiple SDKs

space init nextjs-auth0 feat/refresh-token-security
space init auth0-react feat/refresh-token-security  
space init node-auth0 feat/refresh-token-security

# Each workspace provides:

# - Isolated development environment

# - Consistent sample app testing

# - Shared git history across all workspaces

{code}

### Use Case 2: Issue Investigation & Resolution

{code:language=bash}

# Customer reports issue in GitHub #5678

space init auth0-angular --pr 5678 investigate/customer-issue

# Automatically creates workspace with:

# - Full issue context and customer feedback

# - Related issues and previous solutions

# - Sample app ready for reproduction

# - All customer-provided code snippets in CONTEXT.md

{code}

### Use Case 3: Sample App Development

{code:language=bash}

# Creating new sample for specific use case

space init auth0-spa-js feat/social-login-sample

# Provides:

# - Latest SDK codebase for testing compatibility

# - Existing samples for reference

# - Environment pre-configured for Auth0 tenant

# - Testing framework ready for validation

{code}

---

## ⚙️ Configuration for Auth0 Teams

### Team Configuration Example

{code:language=yaml}

# ~/.space-config.yaml

projects:
nextjs-auth0:
name: 'NextJS Auth0 SDK'
repo: 'https://github.com/auth0/nextjs-auth0.git'
sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
env_file: 'next.env.local'
post-init: 'cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i'

global:
src_dir: '~/src' # Team standard workspace location
workspace_base: 'workspaces' # Consistent naming
env_files_dir: './env-files' # Shared environment templates

workflows:
branch_patterns: # Auth0 branching conventions - 'feature/**' - 'bugfix/**' - 'hotfix/**' - 'explore/**'
{code}

### Environment Templates

Create team-wide environment templates:

{code:language=bash}
env-files/
├── auth0-nextjs.env.local # Next.js specific variables
├── auth0-react.env.local # React SPA variables  
├── auth0-node.env.local # Node.js server variables
├── auth0-java.env.local # Java SDK variables
└── auth0-spa.env.local # Vanilla JS SPA variables
{code}

---

## 🔧 Essential Commands for Auth0 Development

### Creating Workspaces

{code:language=bash}

# Create feature workspace

space init <auth0-sdk> [branch-name]
space init nextjs-auth0 feature/user-profile-hooks

# Create PR review workspace

space init <auth0-sdk> --pr <number> [workspace-name]
space init auth0-react --pr 1234 review/performance-improvements

# Create issue investigation workspace

space init <auth0-sdk> <issue-number> [branch-name]
space init node-auth0 5678 investigate/management-api-timeout
{code}

### Managing Workspaces

{code:language=bash}

# List all Auth0 workspaces

space list

# Get workspace details

space info nextjs-auth0 feature-user-profile-hooks

# Clean up completed work

space clean nextjs-auth0 feature-user-profile-hooks
{code}

### Setup & Validation

{code:language=bash}

# Interactive setup wizard

space setup

# Validate Auth0 SDK configurations

space validate

# Check available Auth0 projects

space projects
{code}

---

## 🚨 Troubleshooting Auth0-Specific Issues

### GitHub CLI Authentication

{code:language=bash}

# Required for accessing Auth0 private repositories

gh auth login

# Verify authentication

gh auth status
{code}

### Git Worktree Conflicts

{code:language=bash}

# Clean stale worktrees (common with multiple Auth0 SDK development)

git worktree prune

# Remove specific workspace if corrupted

space clean <auth0-sdk> <workspace-name>
{code}

### Sample App Build Issues

{code:language=bash}

# Java SDK sample apps

cd auth0-spring-security-mvc-sample && ./gradlew clean build

# Node.js sample apps

cd auth0-nextjs-samples/Sample-01 && npm install && npm run build

# Clear package manager caches

pnpm store prune # for pnpm projects
npm cache clean --force # for npm projects
{code}

### Environment Configuration Issues

{warning:title=Common Auth0 Environment Issues}

- **Missing AUTH0_SECRET**: Required for Next.js and Node.js SDKs
- **Incorrect AUTH0_BASE_URL**: Must match your development setup
- **Missing AUTH0_CLIENT_ID/CLIENT_SECRET**: Required for Management API access
- **NEXTAUTH_URL mismatch**: Common in Next.js sample applications
  {warning}

{code:language=bash}

# Debug environment loading

space --debug init nextjs-auth0 test-env

# Validate environment file existence

ls -la ~/src/workspaces/nextjs-auth0/\*/env.local
{code}

---

## 📈 Performance Benefits for Auth0 Teams

{panel:title=Quantified Benefits}
**🚀 Startup Performance**

- Sub-200ms CLI startup time
- Instant branch switching (no checkout delays)
- Parallel workspace creation

**💾 Storage Efficiency**

- ~70% less disk usage vs separate repository clones
- Shared git history across all Auth0 SDK workspaces
- Efficient worktree management

**⚡ Development Speed**

- Zero-config Auth0 SDK setup
- Automated sample app pairing
- AI-powered context fetching
- Template-driven development workflow

**🔄 Context Switching Reduction**

- Feature-focused directory structure
- Persistent development environments
- Automatic GitHub context preservation
- Consistent tooling across all Auth0 SDKs
  {panel}

---

## 🎓 Getting Started Checklist for Auth0 Teams

{warning:title=Team Onboarding Checklist}
✅ Install Space CLI: `pnpm add -g @tusharpandey13/space-cli`  
✅ Authenticate GitHub CLI: `gh auth login`  
✅ Run setup wizard: `space setup`  
✅ Validate configuration: `space validate`  
✅ Test with sample workspace: `space init nextjs-auth0 test-workspace`  
✅ Create team environment templates in `env-files/`  
✅ Share configuration with team via `~/.space-config.yaml`  
✅ Integrate with existing CI/CD workflows  
{warning}

---

## 🔗 Additional Resources

- **GitHub Repository**: [https://github.com/tusharpandey13/workspace-cli](https://github.com/tusharpandey13/workspace-cli)
- **NPM Package**: [https://www.npmjs.com/package/@tusharpandey13/space-cli](https://www.npmjs.com/package/@tusharpandey13/space-cli)
- **Issues & Support**: [GitHub Issues](https://github.com/tusharpandey13/workspace-cli/issues)
- **Contributing Guide**: [CONTRIBUTING.md](https://github.com/tusharpandey13/workspace-cli/blob/main/CONTRIBUTING.md)

{info:title=Contact & Support}
For Auth0-specific questions or enterprise setup assistance, please reach out to the Auth0 Developer Experience team or create an issue in the Space CLI repository.
{info}
