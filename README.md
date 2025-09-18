# Workspace CLI: Automated workflow coordination ⚡

**Effortlessly handle context switching and context retention**

```bash
workspace init next feature/auth-fix
```

is roughly equivalent to doing:

```bash
# save current work
git add .
git commit -m "WIP: current work"

# get latest commits!
git checkout main
git pull origin main

# create new branch and worktree 🤯
git worktree add ../next-feature-auth-fix -b feature/auth-fix
```

## ✨ Features

- 🚀 Single command workspace setup!
- 🔗 Multi-Repo isolated dev environment setup (repo + sample)
- 📋 AI forward prompt templates
- ⚙️ Stack Agnostic configuration
- 🔧 Built-in system diagnostics with `doctor` command

## ✅ Prerequisites

- **Node.js** (v18 or higher)
- **npm** (for package management)
- **GitHub CLI** (`gh`) - [Install guide](https://cli.github.com/)
- **Git** (v2.25+ for worktree support)

## 🚀 Quick Start

### Option 1: Install from npm (Recommended)

```bash
npm install -g workspace-cli
```

### Option 2: Development Installation

```bash
git clone https://github.com/tusharpandey13/workspace-cli.git
cd workspace-cli
npm install
npm run install-global
```

### System Check

```bash
workspace doctor
```

### Create your first workspace

```bash
workspace init next feature/user-authentication
```

That's it! Your multi-repo development environment is ready.

## ⚙️ Configuration

First, ensure you're authenticated with GitHub CLI:

```bash
gh auth login
```

The CLI comes with example configurations. Check available projects:

```bash
workspace projects
```

Or create a custom `config.yaml` in your home directory (`~/.workspace-config.yaml`):

```yaml
projects:
  next:
    name: 'Auth0 Next.js SDK'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0/nextjs-auth0-example.git'
    env_file: 'next.env.local'
    post-init: 'npm install'

  my-project:
    name: 'My Custom Project'
    repo: 'https://github.com/user/my-repo.git'
    post-init: 'npm install'

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
```

[📚 **Full Configuration Guide →**](./DOCS.md)

## 📖 Usage

```bash
# Check system setup
workspace doctor

# View available projects
workspace projects

# Create workspace for new feature
workspace init next feature/oauth-improvements

# Work on existing GitHub PR
workspace --pr 123 init next

# List all your workspaces
workspace list

# Get workspace details
workspace info next feature_oauth-improvements

# Submit your changes as PR
workspace submit next feature_oauth-improvements

# Clean up when done
workspace clean next feature_oauth-improvements
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
