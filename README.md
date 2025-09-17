# Workspace CLI ⚡

[![npm version](https://badge.fury.io/js/workspace-cli.svg)](https://badge.fury.io/js/workspace-cli)
[![CI](https://github.com/tusharpandey13/workspace-cli/workflows/CI/badge.svg)](https://github.com/tusharpandey13/workspace-cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/workspace-cli.svg)](https://nodejs.org/en/)

**Stop wrestling with multiple git repositories—manage complex multi-repo workflows effortlessly with one command.**

```bash
# Before: 15 manual steps, 5 minutes of setup
cd ~/project-sdk && git checkout -b feature/auth-fix
cd ~/project-samples && git checkout main && git pull
cd ~/project-demos && git checkout main && git pull
# ... copy files, link dependencies, setup environments ...

# After: 1 command, 10 seconds
workspace init myproject feature/auth-fix
```

![CLI Demo](https://raw.githubusercontent.com/tusharpandey13/workspace-cli/main/demo.gif)

## ✨ Features

- 🚀 **One-Command Setup** - Transform hours of manual git worktree management into seconds
- 🔗 **Multi-Repo Sync** - Automatically links SDKs, samples, and demos across repositories
- 📋 **GitHub Integration** - Create workspaces directly from pull requests and issues
- ⚙️ **Stack Agnostic** - Works with any technology stack via YAML configuration
- 🛡️ **Safe & Isolated** - Each workspace is completely independent using git worktrees
- 📦 **Smart Dependencies** - Auto-links packages with yalc for seamless development

## 🚀 Quick Start

```bash
npm install -g workspace-cli
workspace init myproject feature/awesome-feature
cd workspaces/myproject/feature-awesome-feature && code .
```

That's it! Your multi-repo development environment is ready.

## 💡 How It Works

```
Traditional Multi-Repo Development 😫
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ SDK Repo    │  │ Sample Repo │  │ Demo Repo   │
│ Different   │  │ Different   │  │ Different   │
│ Branches    │  │ Branches    │  │ Branches    │
└─────────────┘  └─────────────┘  └─────────────┘
      │                │                │
      └──── Manual Linking & Setup ─────┘
                    (15+ steps)

Workspace CLI Magic ✨
┌─────────────────────────────────────────────────┐
│ Unified Workspace                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ SDK     │──│ Sample  │──│ Demo    │        │
│  │ (linked)│  │ (synced)│  │ (ready) │        │
│  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────┘
                  (1 command)
```

## 📖 Usage

```bash
# Create workspace for new feature
workspace init next feature/oauth-improvements

# Work on existing GitHub PR
workspace init react --pr 123

# List all your workspaces
workspace list

# Submit your changes as PR
workspace submit next feature/oauth-improvements
```

## ⚙️ Configuration

Create a simple `config.yaml`:

```yaml
projects:
  next:
    name: 'Next.js SDK'
    sdk_repo: 'nextjs-auth0'
    sample_repo: 'auth0-nextjs-samples'
    github_org: 'auth0'

  react:
    name: 'React SDK'
    sdk_repo: 'auth0-react'
    sample_repo: 'auth0-react-samples'
    github_org: 'auth0'
```

[📚 **Full Configuration Guide →**](./DOCS.md)

## 🌟 Why Workspace CLI?

**For SDK Teams:**

- Reduce onboarding time from hours to minutes
- Eliminate "it works on my machine" issues
- Streamline testing across multiple sample applications

**For Individual Developers:**

- Stop context switching between 5+ terminal tabs
- Never forget to sync changes across repositories again
- Focus on coding, not repository management

## 🤝 Community & Support

- 💬 **Questions?** [Open a Discussion](https://github.com/tusharpandey13/workspace-cli/discussions)
- 🐛 **Found a bug?** [Create an Issue](https://github.com/tusharpandey13/workspace-cli/issues)
- 🚀 **Want to contribute?** Check out [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📚 **Need detailed docs?** See [DOCS.md](./DOCS.md)

## 📄 License

[MIT](./LICENSE) | [Support](https://github.com/tusharpandey13/workspace-cli/issues)

---

<div align="center">
  <i>Built with ❤️ for developers who juggle multiple repositories</i>
</div>
