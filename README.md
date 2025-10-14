<div align="center">
  <img src="assets/galaxy-icon.svg" width="200" height="200" alt="Space CLI Logo">
</div>

# Space CLI

[![npm version](https://badge.fury.io/js/@tusharpandey13%2Fspace-cli.svg)](https://www.npmjs.com/package/@tusharpandey13/space-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **End context switching pain in monorepos with automated git worktrees**

- Isolated and configurable git-workree backed workspaces.
- Ideal for monorepos and AI assited development.
- Automatically fetches context from github issues and PRs
- Feature-focused directory structure(`/src/next/feat/sso/nextjs-auth0`) instead of project-focused(`/src/nextjs-auth0`)

---

## 🚀 Quick Start

```bash
pnpm add -g @tusharpandey13/space-cli
```

**That's it!** You now have isolated directories for your main repo and samples, ready for development.  
`space` comes **pre-configured** with popular auth0 SDK repos including web, mobile, server and cli repos. Please take a look at the [compatibility matrix](#-compatibility-matrix) for more info.

You can now just run:

```bash
space init auth0-spa-js feat/something
```

and it will create:

```
~/src/workspaces/auth0-spa-js/feat/something/
├── auth0-spa-js/               # Main SDK repository worktree, checked out to your branch
│   ├── src/
│   └── ...
├── auth0-spa-js-sample/        # Sample app repository worktree, checked out to your branch
│   ├── 01-Login/
│   └── ...
├── .env.local                  # Environment configuration (copied from templates)
├── analysis.prompt.md          # Analysis prompt
├── fix-and-test.prompt.md      # Fix and test prompt (project repo and sample repo feedback loop)
├── review-changes.prompt.md    # Review changes done in this branch using this prompt
├── PR_DESCRIPTION_TEMPLATE.md  # use this to create PR description for your changes
└── CONTEXT.md                  # Workspace context
```

The highlight here is the `CONTEXT.MD` file that contains all context from the github ids specified when running `init`. This includes details and comments from issues and PRs. It also contains data from any linked pages in the github ids (from a list of safe domains only).

## 💡 Core Concepts

### Workspaces = Isolated Development Environments

Each workspace is a dedicated directory that doesn't interfere with other work and contains:

- **Project repo** on your target branch
- **Sample repo** for testing (if configured)
- **Environment files** ready to use

### Git Worktrees

Instead of multiple repo clones, Space CLI uses git worktrees:

- ✅ **Shared git history** - One `.git` folder, multiple working directories
- ✅ **Instant branch switching** - No checkout delays
- ✅ **Parallel work** - Multiple branches checked out simultaneously
- ✅ **Disk space savings** - ~70% less storage vs separate clones

---

## ⚙️ Configuration

Space CLI uses `~/.space-config.yaml` as source of truth. Run `space setup` for guided configuration, or create manually.

A sample config is provided below:

```yaml
# ~/.space-config.yaml
projects:
  nextjs-auth0:
    name: 'NextJS Auth0 SDK'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
    env_file: 'next.env.local'
    post-init: 'cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i'

  auth0-java:
    name: 'Auth0 Java Management SDK'
    repo: 'https://github.com/auth0/auth0-java.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-spring-security-mvc-sample.git'
    env_file: 'auth0-java.env.local'
    post-init: 'cd auth0-java && ./gradlew build && cd ../auth0-spring-security-mvc-sample && ./gradlew build'

global:
  src_dir: '~/src' # Where to create workspaces
  workspace_base: 'workspaces' # Subdirectory name
  env_files_dir: './env-files' # Environment templates location
```

### Project Properties

| Property      | Required | Description                    |
| ------------- | -------- | ------------------------------ |
| `name`        | ✅       | Display name                   |
| `repo`        | ✅       | Main repository URL            |
| `sample_repo` | ❌       | Sample/test repository         |
| `env_file`    | ❌       | Environment file to copy       |
| `post-init`   | ❌       | Commands to run after creation |

### Environment Files

Create templates in your `env_files_dir`:

```bash
env-files/
├── next.env.local
├── react.env.local
└── node.env.local
```

These are automatically copied to new workspaces.

## 📊 Compatibility Matrix

These projects come configured out-of-the-box with `space-cli` and dont need much configuration changes. You can of course, add more or edit these:

| Category           | Project Key                | Repository                                                                    | Sample Repository                                                                      | Tech Stack   |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------ |
| **Web SDKs**       | `auth0-spa-js`             | [auth0-spa-js](https://github.com/auth0/auth0-spa-js)                         | [spa-js-samples](https://github.com/tusharpandey13/auth0-spa-js-sample)                | Vanilla JS   |
|                    | `auth0-react`              | [auth0-react](https://github.com/auth0/auth0-react)                           | [react-samples](https://github.com/auth0-samples/auth0-react-samples)                  | React        |
|                    | `nextjs-auth0`             | [nextjs-auth0](https://github.com/auth0/nextjs-auth0)                         | [nextjs-samples](https://github.com/auth0-samples/auth0-nextjs-samples)                | Next.js      |
|                    | `auth0-angular`            | [auth0-angular](https://github.com/auth0/auth0-angular)                       | [angular-samples](https://github.com/auth0-samples/auth0-angular-samples)              | Angular      |
|                    | `auth0-vue`                | [auth0-vue](https://github.com/auth0/auth0-vue)                               | [vue-samples](https://github.com/auth0-samples/auth0-vue-samples)                      | Vue.js       |
|                    | `lock`                     | [lock](https://github.com/auth0/lock)                                         | [javascript-samples](https://github.com/auth0-samples/auth0-javascript-samples)        | JavaScript   |
| **Server SDKs**    | `node-auth0`               | [node-auth0](https://github.com/auth0/node-auth0)                             | [nodejs-samples](https://github.com/auth0-samples/auth0-nodejs-samples)                | Node.js      |
|                    | `express-openid-connect`   | [express-openid-connect](https://github.com/auth0/express-openid-connect)     | [express-samples](https://github.com/auth0-samples/auth0-express-webapp-sample)        | Express.js   |
|                    | `auth0-java`               | [auth0-java](https://github.com/auth0/auth0-java)                             | [spring-mvc-sample](https://github.com/auth0-samples/auth0-spring-security-mvc-sample) | Java         |
|                    | `java-jwt`                 | [java-jwt](https://github.com/auth0/java-jwt)                                 | [java-samples](https://github.com/auth0-samples/auth0-java-samples)                    | Java JWT     |
|                    | `jwks-rsa-java`            | [jwks-rsa-java](https://github.com/auth0/jwks-rsa-java)                       | [spring-mvc-sample](https://github.com/auth0-samples/auth0-spring-security-mvc-sample) | Java JWKS    |
| **Mobile SDKs**    | `react-native-auth0`       | [react-native-auth0](https://github.com/auth0/react-native-auth0)             | [react-native-sample](https://github.com/auth0-samples/auth0-react-native-sample)      | React Native |
| **Infrastructure** | `terraform-provider-auth0` | [terraform-provider-auth0](https://github.com/auth0/terraform-provider-auth0) | [terraform-provider-auth0](https://github.com/auth0/terraform-provider-auth0)          | Terraform    |
|                    | `wordpress`                | [wordpress](https://github.com/auth0/wordpress)                               | [wordpress](https://github.com/auth0/wordpress)                                        | WordPress    |

---

## ✨ Key Features

### AI-Powered Development Workflow

Space CLI transforms your development process with **context-intelligent automation**.

#### **Context Intelligence & Auto-Fetching**

- **Smart CONTEXT.md generation** - Automatically fetches GitHub issue/PR data, comments, and linked documentation from trusted domains
- **Cross-reference detection** - Discovers and includes related issues, PRs, and external documentation
- **Security-validated URL fetching** - Only fetches from pre-approved safe domains to prevent security issues

#### **Structured Development Templates**

**4 workflow templates** that guide development from analysis to deployment:

- **Analysis Templates** - Structured problem analysis with validation questions that prevent unnecessary work
- **Implementation Templates** - Step-by-step development workflow with testing guidance and best practices
- **Review Templates** - Code review process with structured feedback and GitHub integration
- **PR Templates** - Enhanced pull request descriptions with validation requirements

#### **Intelligent Automation**

- **Auto Copilot setup** - Creates project-specific `.github/copilot-instructions.md` with architecture patterns and development guidelines
- **Conditional template selection** - Smart template selection based on project configuration and GitHub context
- **Dynamic placeholder substitution** - Customizes templates with project-specific information and context

### Intelligent Automation

- **Smart gitignore** - Auto-configures based on detected tech stack
- **Environment handling** - Copies and manages env files automatically
- **Post-init scripts** - Runs setup commands after workspace creation
- **Progress tracking** - Visual feedback for long operations

### Performance Optimized

- Sub-200ms startup
- Lazy module loading
- Async operation

---

## 📋 Essential Commands

### Create Workspaces

```bash
space init <project> [branch]           # Create new workspace
space init next feature/user-auth       # Example: NextJS project, auth feature
space init react --pr 123               # Create workspace for PR #123 (auto-infer branch name)
```

### Manage Workspaces

```bash
space list                              # Show all workspaces
space projects                          # Show available projects
space info next feature_user-auth       # Get workspace details
space clean next feature_user-auth      # Remove workspace
```

### Setup & Configuration

```bash
space setup                             # Interactive setup wizard
space validate                          # Check configuration and dependencies
```

---

## �️ Quick Troubleshooting

### Installation Issues

```bash
# Command not found
pnpm add -g @tusharpandey13/space-cli
space --version

# Permission errors
sudo chown -R $(whoami) ~/.pnpm-global  # Fix pnpm permissions
```

### GitHub API Issues

```bash
# No GitHub token (for private repos or higher rate limits)
export GITHUB_TOKEN="ghp_your_token_here"

# Rate limit errors (public repos without token)
export GITHUB_TOKEN="ghp_your_token_here"  # Get 5,000 req/hour instead of 60

# Git worktree conflicts
git worktree prune                       # Clean stale worktrees
space clean <project> <workspace>        # Remove specific workspace
```

### Debug & Validation

```bash
space validate                           # Check setup
space --debug init next test            # Verbose logging
```

**Need more help?** See the [full troubleshooting guide](docs/TROUBLESHOOTING.md) or [open an issue](https://github.com/tusharpandey13/workspace-cli/issues).

---

## ✅ Prerequisites

- **Node.js** v18+ (required for native `fetch()` support)
- **pnpm** (recommended) or npm
- **Git** v2.25+ (for worktree support)
- **GitHub Token** (optional, see below)

### GitHub Token (Optional but Recommended)

A GitHub Personal Access Token is **required for**:

- ✅ Private repository access
- ✅ Higher API rate limits (5,000 vs 60 requests/hour)

**Public repositories** work without a token (60 requests/hour limit).

**How to create a token:**

1. Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Select scopes:
   - `repo` (full control of private repositories)
   - OR `public_repo` (access public repositories only)
4. Copy the token (starts with `ghp_`)
5. Set as environment variable:

```bash
# One-time use:
export GITHUB_TOKEN="ghp_your_token_here"

# Permanent (add to ~/.zshrc or ~/.bashrc):
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**Platform Support**: ✅ macOS, ✅ Linux, ⚠️ Windows (WSL recommended)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Development setup:**

```bash
git clone https://github.com/tusharpandey13/workspace-cli.git
cd workspace-cli
pnpm install && pnpm run install-global:dev
```

---

## 📄 License

[MIT](./LICENSE) | [Issues](https://github.com/tusharpandey13/workspace-cli/issues) | [Discussions](https://github.com/tusharpandey13/workspace-cli/discussions)
