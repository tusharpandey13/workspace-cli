import { execa } from 'execa';

export async function runGit(args: string[], options: Record<string, any> = {}) {
  // Run git commands silently unless caller overrides stdio
  return execa('git', args, { stdio: 'pipe', ...options });
}
