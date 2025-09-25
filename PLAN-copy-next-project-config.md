# Implementation Plan: Copy Next Project to Home Config

## ANALYZE

- **Problem**: User's home config (~/.space-config.yaml) doesn't have "next" project definition
- **Current State**: Home config only has "workflow" project
- **Required Action**: Copy "next" project definition from workspace config.yaml to home config
- **Affected Files**: `~/.space-config.yaml`
- **Risks**: Need to preserve existing config structure and other projects

## PLAN

- [ ] Read the current home config file structure
- [ ] Extract the "next" project definition from workspace config.yaml
- [ ] Add the "next" project to the home config while preserving existing projects
- [ ] Verify the config is valid and the "next" project is accessible
- [ ] Test that `space init next ...` works correctly

## NOTES

- Need to preserve the existing "workflow" project in home config
- Should maintain the same YAML structure and formatting
- The "next" project from config.yaml includes sample_repo, env_file, and post-init commands
