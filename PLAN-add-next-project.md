# Implementation Plan: Add Next Project to Configuration

## ANALYZE

- **Problem**: CLI loading `~/.space-config.yaml` instead of local `config.yaml`
- **Root Cause**: Config precedence order prioritizes home directory config over local config
- **Available Projects**: Currently only `workflow` in home config, but `next` exists in local config
- **Solution**: Add the `next` project from local config.yaml to home directory config

## AFFECTED FILES

- `~/.space-config.yaml` (home directory config that CLI is actually using)
- Reference: `/Users/tushar.pandey/src/workspace-cli/config.yaml` (source of truth)

## PLAN

- [ ] Backup current home directory config file
- [ ] Read the local config.yaml to get the `next` project definition
- [ ] Add the `next` project to the home directory config
- [ ] Validate the updated configuration works by testing CLI commands
- [ ] Verify the `space init next 2326 bugfix/RT-same-scope-as-AT` command works

## IMPLEMENTATION NOTES

- Home directory config path: `/Users/tushar.pandey/.space-config.yaml`
- Local config path: `/Users/tushar.pandey/src/workspace-cli/config.yaml`
- The `next` project should include all properties: name, repo, sample_repo, env_file, post-init

## VALIDATION

- [ ] Run `pnpm exec space projects` to verify `next` project appears
- [ ] Test the original failing command: `space init next 2326 bugfix/RT-same-scope-as-AT`
- [ ] Ensure both `workflow` and `next` projects are available
