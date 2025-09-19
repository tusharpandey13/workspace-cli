import fs from 'fs-extra';
import { runGit } from '../utils/git.js';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, GitError, FileSystemError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

export function submitCommand(program: Command): void {
  program
    .command('submit <project> <workspace>')
    .description(
      '**HUMAN-SUPERVISED**: Review, commit, push changes, and create a pull request for the workspace',
    )
    .option(
      '--silent',
      'Silent mode: auto-stage and commit with default message (fire-and-forget mode)',
    )
    .option('--dry-run', 'Dry run mode: show what would be done without making changes')
    .addHelpText(
      'after',
      `
Examples:
    $ space submit next feature_my-new-feature

Examples:
  $ space submit spa bugfix_issue-123
    Submit the Next.js workspace "feature_my-new-feature"

  $ workspace submit spa bugfix_issue-123
    Submit the SPA JS workspace "bugfix_issue-123"

Description:
  ⚠️  HUMAN OVERSIGHT REQUIRED: This command assists with submission but YOU make all decisions.

  The process provides guided steps for workspace submission:

  1. Shows you a diff of all changes for manual review
  2. Prompts for confirmation before staging changes (git add .)
  3. Allows you to review staged changes before committing
  4. Prompts for custom commit message (with suggested default)
  5. Shows push command for you to execute manually
  6. Provides GitHub CLI command for PR creation

  Default commit message format:
  "feat: submit <project> workspace <workspace>"

  Requirements:
  • GitHub CLI (gh) must be installed and authenticated
  • The workspace must have an SDK worktree with changes
  • You must have push permissions to the repository
  • Manual review and approval of each step

  🎯 Philosophy: You remain in control of all git operations - this tool 
  provides suggestions and automation, but you make the final decisions.

Related commands:
  space info        Check workspace status before submitting
  space list        List all workspaces
  space clean       Clean up after successful submission`,
    )
    .action(
      async (
        project: string,
        workspace: string,
        options: { silent?: boolean; dryRun?: boolean },
      ) => {
        try {
          const validatedProject = validateProjectKey(project);
          const validatedWorkspace = validateWorkspaceName(workspace);
          const isSilent = options.silent || false;
          const isDryRun = options.dryRun || false;

          const projectConfig = configManager.validateProject(validatedProject);
          const paths = configManager.getWorkspacePaths(validatedProject, validatedWorkspace);

          if (!fs.existsSync(paths.sourcePath)) {
            throw new FileSystemError(`Source worktree not found at ${paths.sourcePath}`);
          }

          if (isSilent) {
            logger.info('🔕 SILENT MODE: Auto-staging and committing with default message');
          }

          if (isDryRun) {
            logger.info('🧪 DRY RUN MODE: Showing what would be done without making changes');
          }

          logger.info(`🔍 Reviewing ${projectConfig.name} workspace: ${validatedWorkspace}`);

          // Step 1: Show diff for human review (unless silent)
          logger.step(1, 5, 'Showing workspace changes for your review...');
          try {
            await runGit(['diff', '--stat'], { cwd: paths.sourcePath });
            if (!isSilent) {
              await runGit(['diff'], { cwd: paths.sourcePath });
            }
          } catch (err) {
            logger.warn(`No changes to display or git diff failed: ${(err as Error).message}`);
          }

          // Step 2: Handle staging based on mode
          logger.step(2, 5, 'Ready to stage changes...');
          let shouldStage = true;

          if (!isSilent) {
            const readline = await import('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const stageAnswer = await new Promise<string>((resolve) => {
              rl.question('🤔 Stage all changes with "git add ."? [y/N] ', resolve);
            });

            shouldStage = stageAnswer.toLowerCase() === 'y' || stageAnswer.toLowerCase() === 'yes';
            rl.close();

            if (!shouldStage) {
              logger.info(
                '❌ Staging cancelled. You can stage changes manually and re-run submit.',
              );
              return;
            }
          }

          if (shouldStage) {
            try {
              logger.verbose('Staging changes...');
              await runGit(['add', '.'], { cwd: paths.sourcePath });
              logger.success('Changes staged');

              // Step 3: Show staged changes
              logger.step(3, 5, 'Staged changes:');
              await runGit(['diff', '--cached', '--stat'], { cwd: paths.sourcePath });

              // Step 4: Handle commit message based on mode
              logger.step(4, 5, 'Creating commit...');
              const defaultMessage = `feat: submit ${validatedProject} workspace ${validatedWorkspace}`;
              let commitMessage = defaultMessage;

              if (!isSilent) {
                const readline = await import('readline');
                const rl = readline.createInterface({
                  input: process.stdin,
                  output: process.stdout,
                });

                commitMessage = await new Promise<string>((resolve) => {
                  rl.question(`💬 Commit message [${defaultMessage}]: `, (answer) => {
                    resolve(answer.trim() || defaultMessage);
                  });
                });

                rl.close();
              } else {
                logger.info(`📝 Using default commit message: "${commitMessage}"`);
              }

              await runGit(['commit', '-m', commitMessage], { cwd: paths.sourcePath });
              logger.success('Commit created');

              // Step 5: Provide manual commands for push and PR
              logger.step(5, 5, 'Next steps (execute manually):');
              logger.info('');
              logger.info('📤 Push changes:');
              logger.info(`   cd ${paths.sourcePath}`);
              logger.info('   git push -u origin HEAD');
              logger.info('');
              logger.info('🔗 Create pull request:');
              const githubCli = 'gh'; // GitHub CLI tool
              logger.info(`   cd ${paths.sourcePath}`);
              logger.info(`   ${githubCli} pr create --fill`);
              logger.info('');
              logger.success(
                '🎯 Workspace prepared for submission. Execute the commands above manually.',
              );
            } catch (err) {
              const error = err as any;
              if (error.command?.includes('git')) {
                throw new GitError(`Git operation failed: ${error.message}`, error);
              }
              throw new Error(`Submission preparation failed: ${error.message}`);
            }
          }
        } catch (error) {
          handleError(error as Error, logger);
        }
      },
    );
}
