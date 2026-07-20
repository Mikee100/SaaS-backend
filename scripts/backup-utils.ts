import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface RunCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface DbConnectionInfo {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  sslmode?: string;
}

export const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
export const BACKUP_LOG_PATH = path.join(BACKUP_DIR, 'backup.log');
export const BACKUP_FILE_PREFIX = 'adeera_backup';

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadEnvFromBackendRoot(): Promise<void> {
  const envPath = path.resolve(process.cwd(), '.env');
  let content: string;

  try {
    content = await fs.readFile(envPath, 'utf8');
  } catch {
    return;
  }

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = parseEnvValue(trimmed.slice(eqIndex + 1));
    process.env[key] = value;
  }
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return value;
}

export function parseDatabaseUrl(databaseUrl: string): DbConnectionInfo {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }

  if (!url.protocol.startsWith('postgres')) {
    throw new Error('DATABASE_URL must use a postgres:// or postgresql:// scheme.');
  }

  const username = decodeURIComponent(url.username || '');
  const password = decodeURIComponent(url.password || '');
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!username || !database || !url.hostname) {
    throw new Error('DATABASE_URL is missing required host/user/database parts.');
  }

  return {
    host: url.hostname,
    port: url.port || '5432',
    username,
    password,
    database,
    sslmode: url.searchParams.get('sslmode') || undefined,
  };
}

export function buildTimestampFileName(prefix = BACKUP_FILE_PREFIX): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}_${stamp}.dump`;
}

export async function ensureBackupDirectory(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

export async function runCommand(
  command: string,
  args: string[],
  options?: {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
  },
): Promise<RunCommandResult> {
  return await new Promise<RunCommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options?.env,
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function sanitizeLogValue(input: string): string {
  return input.replace(/[\r\n]+/g, ' | ').trim();
}

export async function appendBackupLog(params: {
  outcome: 'SUCCESS' | 'FAILURE';
  fileName?: string;
  sizeBytes?: number;
  message: string;
}): Promise<void> {
  await ensureBackupDirectory();

  const timestamp = new Date().toISOString();
  const details: string[] = [
    `timestamp=${timestamp}`,
    `outcome=${params.outcome}`,
    `file=${params.fileName ?? '-'}`,
    `sizeBytes=${params.sizeBytes ?? 0}`,
    `message=${sanitizeLogValue(params.message)}`,
  ];

  await fs.appendFile(BACKUP_LOG_PATH, `${details.join(' | ')}\n`, 'utf8');
}

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}
