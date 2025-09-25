<div align="center">
  <img src="assets/galaxy-icon.svg" width="200" height="200" alt="Space CLI Logo">
</div>

# Space CLI

> **Stack-agnostic workspace CLI using git worktrees**

Space CLI is a powerful development tool that automates multi-worktree workflows for any codebase. Create isolated development environments for different branches, features, or pull requests without the overhead of multiple repository clones.

[![npm version](https://badge.fury.io/js/@tusharpandey13%2Fspace-cli.svg)](https://www.npmjs.com/package/@tusharpandey13/space-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start

### Installation

**Global Installation (Recommended):**

```bash
pnpm add -g @tusharpandey13/space-cli
space --help
```

**Alternative with npm:**

```bash
npm i -g @tusharpandey13/space-cli
space --help
```

**One-time usage:**

```bash
npx @tusharpandey13/space-cli --help
npx @tusharpandey13/space-cli init next feature/my-branch
```

### Your First Workspace

```bash
# 1. Set up space CLI (first time only)
space setup

# 2. See available projects
space projects

# 3. Create a workspace for a new feature
space init next feature/auth-improvements

# 4. Start developing in the created directories
cd ~/src/workspaces/next_feature-auth-improvements
```

---

## 💡 Core Concepts

### What are Workspaces?

A **workspace** is an isolated development environment that contains:

- A main repository checked out to your target branch
- Related sample/test repositories
- Environment configuration files
- Dedicated directory structure

### Why Git Worktrees?

Instead of cloning repositories multiple times, Space CLI uses **git worktrees** to:

- 🚀 **Save disk space** - Share git objects between worktrees
- ⚡ **Switch contexts faster** - No need to stash/commit/checkout
- 🔄 **Work on multiple features** - Parallel development environments
- 🧪 **Test different branches** - Isolated environments for each branch
- 🎯 **Optimized performance** - ~195ms startup time, 12MB memory footprint

---

## 📋 Commands

### Essential Commands

#### `space init <project> [branch]`

Create a new workspace for the specified project and branch.

```bash
space init next feature/user-auth
space init react bugfix/navbar-issue
space --pr 123 init next  # Create workspace for PR #123
```

#### `space list`

Show all existing workspaces across all projects.

```bash
space list
```

#### `space projects`

Display available projects from your configuration.

```bash
space projects
```

#### `space info <project> <workspace>`

Get detailed information about a specific workspace.

```bash
space info next feature_user-auth
```

#### `space clean <project> <workspace>`

Remove a workspace completely.

```bash
space clean next feature_user-auth
```

### Management Commands

#### `space setup`

Interactive setup wizard to configure Space CLI.

```bash
space setup
```

#### `space validate`

Validate your current configuration and dependencies.

```bash
space validate
```

---

## ⚙️ Configuration

Space CLI uses a `config.yaml` file to define projects and global settings.

### Basic Configuration

```yaml
# config.yaml
projects:
  next:
    name: 'Next.js Project'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
    env_file: 'next.env.local'
    post-init: 'cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i'

  react:
    name: 'React SPA'
    repo: 'https://github.com/auth0/auth0-react.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-react-samples.git'
    env_file: 'react.env.local'

global:
  src_dir: '~/src' # Base directory for all workspaces
  workspace_base: 'workspaces' # Subdirectory name for workspaces
  env_files_dir: './env-files' # Location of environment templates

workflows:
  branch_patterns:
    - 'feature/**'
    - 'bugfix/**'
    - 'hotfix/**'
    - 'explore/**'
```

### Project Properties

| Property                  | Required | Description                                |
| ------------------------- | -------- | ------------------------------------------ |
| `name`                    | ✅       | Display name for the project               |
| `repo`                    | ✅       | Main repository URL                        |
| `sample_repo`             | ❌       | Additional repository for samples/examples |
| `env_file`                | ❌       | Environment file template to copy          |
| `post-init` / `post_init` | ❌       | Command to run after workspace creation    |

### Environment Files

Place environment templates in your configured `env_files_dir`:

```bash
env-files/
├── next.env.local
├── react.env.local
└── node.env.local
```

These files are automatically copied to new workspaces and can contain project-specific environment variables.

---

## 🔧 Advanced Features

### Pull Request Workflows

Create workspaces directly from GitHub pull requests:

```bash
# Create workspace for PR #123
space --pr 123 init next

# Space CLI will:
# 1. Fetch the PR branch
# 2. Create workspace with PR-specific naming
# 3. Set up environment for testing the PR
```

### Post-Init Scripts

Automate setup tasks after workspace creation:

```yaml
projects:
  next:
    post-init: |
      cd nextjs-auth0 && pnpm install
      cd ../samples && pnpm install
      echo "✅ Dependencies installed"
```

### Custom Branch Patterns

Configure which branch patterns are supported:

```yaml
workflows:
  branch_patterns:
    - 'feature/**' # feature/user-auth
    - 'bugfix/**' # bugfix/login-issue
    - 'hotfix/**' # hotfix/security-patch
    - 'experiment/**' # experiment/new-api
```

### Non-Interactive Mode

Run Space CLI in scripts and CI/CD:

```bash
space --non-interactive init next feature/my-branch
```

---

## 🎯 Development Workflows

### Feature Development

```bash
# 1. Start new feature
space init myapp feature/user-profiles

# 2. Develop in dedicated environment
cd ~/src/workspaces/myapp_feature-user-profiles/myapp
# Make changes...

# 3. Test with samples
cd ../myapp-samples
# Run tests against your changes...

# 4. Clean up when done
space clean myapp feature_user-profiles
```

### Bug Investigation

```bash
# Create workspace to investigate issue
space init myapp bugfix/login-timeout

# Work in isolation without affecting main development
cd ~/src/workspaces/myapp_bugfix-login-timeout
```

### PR Review

```bash
# Review someone's pull request
space --pr 456 init myapp

# Test their changes in isolated environment
cd ~/src/workspaces/myapp_pr-456
```

---

## 🛠️ Troubleshooting

### Common Issues

#### "No GitHub CLI token found"

```bash
# Login to GitHub CLI
gh auth login
```

#### "Git worktree already exists"

```bash
# Clean up stale worktrees
git worktree prune

# Or remove specific workspace
space clean <project> <workspace>
```

#### "Command not found: space"

```bash
# Reinstall globally
pnpm add -g @tusharpandey13/space-cli

# Verify installation
space --version
```

#### "Permission denied" errors

```bash
# Check script permissions (development setup)
scripts/troubleshoot.sh
```

### Debug Mode

Run commands with verbose logging:

```bash
space --debug init next feature/my-branch
```

### Validation

Check your setup and configuration:

```bash
space validate
```

---

## ⚡ Performance

Space CLI is optimized for fast, responsive operation:

- **Startup time**: ~195ms (3x faster than baseline)
- **Memory usage**: 12MB footprint (76% improvement)
- **Config loading**: Cached with 99.6% performance improvement
- **Command loading**: Lazy-loaded with 500x better performance than targets

### Environment Controls

Disable optimizations for debugging:

```bash
# Disable configuration caching
WORKSPACE_DISABLE_CACHE=1 space init next feature/test

# Disable lazy module loading
WORKSPACE_DISABLE_LAZY=1 space --help
```

---

## ✅ Prerequisites

- **Node.js** v18 or higher
- **pnpm** (recommended) or npm for package management
- **GitHub CLI** (`gh`) - [Installation guide](https://cli.github.com/)
- **Git** v2.25+ (for worktree support)

### System Compatibility

- ✅ **macOS** (Primary support)
- ✅ **Linux** (Tested)
- ⚠️ **Windows** (Basic support, may require WSL)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Development Setup

```bash
git clone https://github.com/tusharpandey13/workspace-cli.git
cd workspace-cli
pnpm install
pnpm run install-global:dev  # Install development version
```

### Running Tests

```bash
pnpm test                # Unit tests
pnpm run test:coverage   # With coverage
```

---

## 📄 License

[MIT](./LICENSE) | [Issues](https://github.com/tusharpandey13/workspace-cli/issues) | [Discussions](https://github.com/tusharpandey13/workspace-cli/discussions)

## 🎨 Attributions

Galaxy icon by Yeni from <a href="https://thenounproject.com/browse/icons/term/galaxy/" target="_blank" title="Galaxy Icons">Noun Project</a> (CC BY 3.0)
