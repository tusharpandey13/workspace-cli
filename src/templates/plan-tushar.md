plan:
to remove JS/TS coupling and make the CLI very simple and stack agnostic
this will involve stripping current JS/TS specific features

final expectation:
if i run `workspace init <repo_name> <...github_ids> prefix/branch_name`
it should:

- make a new worktree for the branch `prefix/branch_name` for the repo `repo_name`
- optionally, setup a worktree for sample app for said `repo_name`, only done if explicitly enabled in config
- pull data from all the mentioned github_ids
- ask for any further context and pull data from there if needed
- determine workflow type and populate and prepare prompt files

no repo/stack-specifc init step is done by default.
an optional post-setup task will take care of things like `npm i` or `gradlew build` etc, if explicitly mentioned.

final config file should look like:

```yaml
projects:
  <project_1>:
    name: 'friendly name'
    repo: 'git-path-of-the-repo.git'
    sample_repo: 'optional-git-path-of-sample-repo.git'
    env_file: 'optional-local-path-relative-to-env_files_dir-of-env-file-to-copy-to-sample-repo.env'
    post-init: 'optional shell command of post init'

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  env_files_dir: './env-files'

templates:
  dir: './src/templates'

  # Which templates to copy for each project type
  common:
    - 'analysis.prompt.md'
    - 'review-changes.prompt.md'
    - 'tests.prompt.md'
    - 'fix-and-test.prompt.md'
    - 'PR_DESCRIPTION_TEMPLATE.md'
```

do whatever changes required in the backend for this simplistic workflow
reomve any JS/TS specific code
remove any JS/TS specific instructions from the prompts

no backwards compat needed.
remember, the main goal here is to make the cli more simple and ready for an MVP and a presentation
