import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Minimal .env loader (no runtime dependencies): reads apps/bot/.env when
 * present and fills in variables that are not already set in the environment.
 */
function loadDotEnv(): void {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

export const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
export const API_URL = process.env.API_URL ?? 'http://localhost:4001';
// Shared secret for /auth/telegram/* — must match BOT_API_KEY in apps/api/.env
// (the API's dev default is `dev-bot-key`).
export const BOT_API_KEY = process.env.BOT_API_KEY ?? 'dev-bot-key';
export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:4000';
