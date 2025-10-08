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

## 🚀 Quick Start

```bash
pnpm add -g @tusharpandey13/space-cli
```

**That's it!** You now have isolated directories for your main repo and samples, ready for development.  
`space` comes **pre-configured** with popular auth0 SDK repos including web, mobile, server and cli repos. Please take a look at the **compatibility matrix** for more info

// make a table here of supported repos and example repos

You can now just run:

```
space init auth0-spa-js feat/something
```

and it will create

// add a sample directory tree here of an example usecase for high-level inference

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

## ✨ Key Features

### AI-Powered Development

- **Auto Copilot setup** - Creates `.github/copilot-instructions.md` with project context
- **Smart PR templates** - Structured review templates with security checklists
- **Analysis templates** - Pre-built prompts for issue investigation
- **Sample integration** - AI helps reproduce issues in sample apps

### Intelligent Automation

- **Smart gitignore** - Auto-configures based on detected tech stack
- **Environment handling** - Copies and manages env files automatically
- **Post-init scripts** - Runs setup commands after workspace creation
- **Progress tracking** - Visual feedback for long operations

### Performance Optimized

- **Sub-200ms startup** - Cached config loading
- **Lazy module loading** - Only loads what you need
- **12MB memory footprint** - Lightweight and fast

---

## 📋 Essential Commands

### Create Workspaces

```bash
space init <project> [branch]           # Create new workspace
space init next feature/user-auth       # Example: NextJS project, auth feature
space --pr 123 init react               # Create workspace for PR #123
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

### Common Workflows

**Feature Development:**

```bash
space init myapp feature/new-login      # Create workspace
cd ~/src/workspaces/myapp/feature/new-login/myapp
# Work on your feature...
space clean myapp feature/new-login     # Clean up when done
```

**Bug Investigation:**

```bash
space init myapp bugfix/timeout-issue   # Isolated environment for bug fixing
cd ~/src/workspaces/myapp/bugfix/timeout-issue
# Investigate and fix...
```

**PR Review:**

```bash
space --pr 456 init myapp               # Review someone's PR
cd ~/src/workspaces/myapp/pr-456
# Test their changes...
```

---

## ⚙️ Configuration

Space CLI uses a simple `config.yaml` file. Run `space setup` for guided configuration, or create manually:

```yaml
# config.yaml
projects:
  nextjs-auth0:
    name: 'NextJS Auth0 SDK'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
    env_file: 'next.env.local'
    post-init: 'cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i'

  react-spa:
    name: 'React SPA Auth0'
    repo: 'https://github.com/auth0/auth0-react.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-react-samples.git'
    env_file: 'react.env.local'

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

### GitHub Issues

```bash
# No GitHub CLI token
gh auth login

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

- **Node.js** v18+
- **pnpm** (recommended) or npm
- **GitHub CLI** - [Install guide](https://cli.github.com/)
- **Git** v2.25+ (for worktree support)

**Platform Support**: ✅ macOS, ✅ Linux, ⚠️ Windows (WSL recommended)

---

## � Documentation

- **[Quick Start Guide](docs/QUICK_START.md)** - Get running in 5 minutes
- **[Configuration Guide](docs/CONFIGURATION.md)** - Detailed setup options
- **[Features Overview](docs/FEATURES.md)** - Complete feature list
- **[Development Report](docs/COMPREHENSIVE_DEVELOPMENT_REPORT.md)** - Architecture deep-dive

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
