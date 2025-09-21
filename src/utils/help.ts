import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Read help content from assets/help directory
 */
export function readHelpFile(filename: string): string {
  try {
    // From dist/utils, go up to project root, then to assets/help
    const helpPath = join(__dirname, '../../assets/help', filename);
    return readFileSync(helpPath, 'utf-8');
  } catch (error) {
    console.warn(
      `Warning: Could not read help file ${filename} at ${join(__dirname, '../../assets/help', filename)}`,
    );
    return '';
  }
}

/**
 * Build complete help text from individual help files
 */
export function buildHelpText(): string {
  const globalOptions = readHelpFile('global-options.txt');
  const examples = readHelpFile('examples.txt');
  const gettingStarted = readHelpFile('getting-started.txt');

  return `
${globalOptions}

${examples}

${gettingStarted}`;
}
