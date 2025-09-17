# Workspace CLI Setup Guide

## Quick Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <repository>
   cd workspace-cli
   pnpm install
   ```

2. **One-time pnpm setup (if not done before):**

   ```bash
   pnpm setup
   source ~/.zshrc  # or restart your terminal
   ```

3. **Install CLI globally:**

   ```bash
   pnpm run install-global
   ```

4. **Verify installation:**
   ```bash
   workspace --version
   workspace --help
   ```

## Usage

```bash
# Initialize a new workspace
workspace init next chore/my-feature

# List available projects
workspace projects

# List active workspaces
workspace list

# Get workspace info
workspace info next my-workspace

# Clean up workspace
workspace clean next my-workspace

# Submit changes and create PR
workspace submit next my-workspace
```

## Development

```bash
# Run tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Lint code
pnpm run lint

# Build TypeScript
pnpm run build

# Run in development mode
pnpm run dev

# Reinstall globally after changes
pnpm run install-global
```

## Uninstall

```bash
pnpm run uninstall-global
```
