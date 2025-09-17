# Workspace CLI : Automated workflow coordination ⚡

**Effortlessly handle context switching and context retention**

```bash
workspace init next-sdk feature/auth-fix
```

is roughly equivanent to doing:

```bash
# save current work!
git add .
git commit -m "WIP: current work"

# get latest commits!
git checkout main
git pull origin main

# create new branch and worktree 🤯
git worktree add ../sdk-feature-branch -b feature/auth-fix
```

## ✨ Features

- 🚀 Single command workspace setup!
- 🔗 Multi-Repo isolated dev environment setup (repo + sample)
- 📋 AI forward
- ⚙️ Stack Agnostic

## ✅ Prerequisites

- **Node.js** (v18 or higher)
- **npm** (for package management)
- **GitHub CLI** (`gh`) - [Install guide](https://cli.github.com/)
- **Git** (v2.25+ for worktree support)

## 🚀 Quick Start

Clone and install globally

```bash
git clone https://github.com/tusharpandey13/workspace-cli.git && cd workspace-cli && npm install && npm run install-global
```

Create your first workspace

```bash
workspace init myproject feature/user-authentication
```

That's it! Your multi-repo development environment is ready.

## ⚙️ Configuration

First, ensure you're authenticated with GitHub CLI:

```bash
gh auth login
```

Then create a simple `config.yaml` in your home directory or project root:

```yaml
projects:
  next:
    name: 'Next.js SDK'
    sdk_repo: 'nextjs-auth0'
    sample_repo: 'auth0-nextjs-samples'
    github_org: 'auth0'

  java:
    name: 'Auth0 Java SDK'
    repo: 'https://github.com/auth0/auth0-java.git'
```

[📚 **Full Configuration Guide →**](./DOCS.md)

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

## 🌟 Why Workspace CLI?

**For SDK Teams:**

- Reduce developer onboarding from hours to minutes
- Eliminate "it works on my machine" issues across environments
- Streamline testing workflows across multiple sample applications

**For Individual Developers:**

- Stop managing complex worktree setups across multiple repositories
- Never manually coordinate branch states across repos again
- Focus on coding, not repository coordination

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
