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
    .description('**HUMAN-SUPERVISED**: Review, commit, push changes, and create a pull request for the workspace')
    .argument('<project>', 'Project key (e.g., next, spa)')
    .argument('<workspace>', 'Workspace name to submit')
    .addHelpText('after', `
Examples:
  $ workspace submit next feature_my-new-feature
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
  workspace info        Check workspace status before submitting
  workspace list        List all workspaces
  workspace clean       Clean up after successful submission`)
    .action(async (project: string, workspace: string) => {
      try {
        const validatedProject = validateProjectKey(project);
        const validatedWorkspace = validateWorkspaceName(workspace);
        
        const projectConfig = configManager.validateProject(validatedProject);
        const paths = configManager.getWorkspacePaths(validatedProject, validatedWorkspace);

        if (!fs.existsSync(paths.sdkPath)) {
          throw new FileSystemError(`SDK worktree not found at ${paths.sdkPath}`);
        }

        logger.info(`🔍 Reviewing ${projectConfig.name} workspace: ${validatedWorkspace}`);
        
        // Step 1: Show diff for human review
        logger.step(1, 5, 'Showing workspace changes for your review...');
        try {
          await runGit(['diff', '--stat'], { cwd: paths.sdkPath });
          await runGit(['diff'], { cwd: paths.sdkPath });
        } catch (err) {
          logger.warn(`No changes to display or git diff failed: ${(err as Error).message}`);
        }

        // Step 2: Prompt for staging approval  
        logger.step(2, 5, 'Ready to stage changes...');
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const stageAnswer = await new Promise<string>((resolve) => {
          rl.question('🤔 Stage all changes with "git add ."? [y/N] ', resolve);
        });

        if (stageAnswer.toLowerCase() !== 'y' && stageAnswer.toLowerCase() !== 'yes') {
          rl.close();
          logger.info('❌ Staging cancelled. You can stage changes manually and re-run submit.');
          return;
        }

        try {
          logger.verbose('Staging changes...');
          await runGit(['add', '.'], { cwd: paths.sdkPath });
          logger.success('✅ Changes staged');

          // Step 3: Show staged changes
          logger.step(3, 5, 'Staged changes:');
          await runGit(['diff', '--cached', '--stat'], { cwd: paths.sdkPath });

          // Step 4: Prompt for commit message
          logger.step(4, 5, 'Creating commit...');
          const defaultMessage = `feat: submit ${validatedProject} workspace ${validatedWorkspace}`;
          
          const commitMessage = await new Promise<string>((resolve) => {
            rl.question(`💬 Commit message [${defaultMessage}]: `, (answer) => {
              resolve(answer.trim() || defaultMessage);
            });
          });

          await runGit(['commit', '-m', commitMessage], { cwd: paths.sdkPath });
          logger.success('✅ Commit created');

          // Step 5: Provide manual commands for push and PR
          logger.step(5, 5, 'Next steps (execute manually):');
          logger.info('');
          logger.info('📤 Push changes:');
          logger.info(`   cd ${paths.sdkPath}`);
          logger.info('   git push -u origin HEAD');
          logger.info('');
          logger.info('🔗 Create pull request:');
          const global = configManager.getGlobal();
          const githubCli = global.github_cli || 'gh';
          logger.info(`   cd ${paths.sdkPath}`);
          logger.info(`   ${githubCli} pr create --fill`);
          logger.info('');
          logger.success('🎯 Workspace prepared for submission. Execute the commands above manually.');

        } catch (err) {
          rl.close();
          const error = err as any;
          if (error.command?.includes('git')) {
            throw new GitError(`Git operation failed: ${error.message}`, error);
          }
          throw new Error(`Submission preparation failed: ${error.message}`);
        } finally {
          rl.close();
        }
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
