import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import os from 'os';

export function loadEnv(customPath?: string): void {
  const defaultPath = path.join(os.homedir(), '.workspace.env');
  const envPath = customPath || defaultPath;
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
