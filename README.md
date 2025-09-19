<div align="center">
  <img src="assets/galaxy-icon.svg" width="200" height="200" alt="Space CLI Logo">
</div>

# Space CLI: Automated workflow coordination ⚡

**Effortlessly handle context switching and context retention**

```bash
space init next feature/auth-fix
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
npm install -g @tusharpandey13/space-cli
```

### Option 2: Development Installation

```bash
git clone https://github.com/tusharpandey13/workspace-cli.git
cd workspace-cli
npm install
npm run install-global
```

**If you encounter permission issues:**

```bash
# Alternative: Use the installation script
node scripts/install.js

# Or run step by step:
npm install
npm run build
chmod +x dist/bin/workspace.js  # Ensure executable permissions
npm link
```

### System Check

```bash
space doctor
```

### Create your first workspace

```bash
space init next feature/user-authentication
```

That's it! Your multi-repo development environment is ready.

## ⚙️ Configuration

First, ensure you're authenticated with GitHub CLI:

```bash
gh auth login
```

The CLI comes with example configurations. Check available projects:

```bash
space projects
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
space doctor

# View available projects
space projects

# Create workspace for new feature
space init next feature/oauth-improvements

# Work on existing GitHub PR
space --pr 123 init next

# List all your workspaces
space list

# Get workspace details
space info next feature_oauth-improvements

# Submit PR for workspace
space submit next feature_oauth-improvements

# Remove workspace when done
space clean next feature_oauth-improvements
```

## 🌟 Why Space CLI?

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

## 🔧 Troubleshooting

### Installation Issues

**"permission denied: space"**

```bash
# Fix permissions and reinstall
chmod +x dist/bin/workspace.js
npm unlink && npm link

# Or use the installation script
node scripts/install.js
```

**"space command not found"**

```bash
# Check if globally installed
which space

# If not found, reinstall
npm run install-global
```

**"Repository not found locally"**
The CLI now automatically clones missing repositories. If you see this error, you're using an older version:

```bash
# Update to latest version
git pull origin main
npm run install-global
```

## 📄 License

[MIT](./LICENSE) | [Support](https://github.com/tusharpandey13/workspace-cli/issues)

## 🎨 Attributions

Galaxy icon by Yeni from <a href="https://thenounproject.com/browse/icons/term/galaxy/" target="_blank" title="Galaxy Icons">Noun Project</a> (CC BY 3.0)

---

<div align="center">
  <i>Built with ❤️ for developers who juggle multiple repositories</i>
</div>
