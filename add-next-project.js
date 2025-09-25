import { load, dump } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load current home config
const homeConfigPath = join(process.env.HOME, '.space-config.yaml');
const localConfigPath = join(__dirname, 'config.yaml');

const homeConfig = load(readFileSync(homeConfigPath, 'utf8'));
const localConfig = load(readFileSync(localConfigPath, 'utf8'));

// Add the next project from local config to home config
homeConfig.projects.next = localConfig.projects.next;

// Write the updated config back to home directory
const updatedYaml = dump(homeConfig, {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
});

writeFileSync(homeConfigPath, updatedYaml);
console.log('Successfully added next project to home directory config');
