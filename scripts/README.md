# Database Backup Toolkit (Local Windows Setup)

This folder contains a local-first backup toolkit for the Adeera backend PostgreSQL database.

All scripts read `DATABASE_URL` from `backend/.env`. No credentials are hardcoded in script files.

## Scripts

- `npm run backup`
Creates a compressed PostgreSQL custom-format dump (`pg_dump -Fc`) into `backend/backups/`.

- `npm run backup:cleanup`
Deletes old `.dump` backup files based on retention policy.

- `npm run backup:test-restore`
Restores the latest backup into a dedicated test database (`adeera_test_restore` by default), then runs sanity checks.

- `npm run backup:daily`
Runs backup, then cleanup. This is the command recommended for Task Scheduler.

## Backup File And Log Locations

- Backup files: `backend/backups/adeera_backup_YYYY-MM-DD_HHMM.dump`
- Log file: `backend/backups/backup.log`

Every run appends a log line with:
- timestamp
- outcome (`SUCCESS` or `FAILURE`)
- file name
- file size in bytes
- message (includes stderr/stdout on failure)

## Retention Policy

Default retention is 7 days.

Configure with environment variable in `backend/.env`:

```env
BACKUP_RETENTION_DAYS=7
```

Then run:

```bash
npm run backup:cleanup
```

## Restore Verification Script Details

`npm run backup:test-restore` does the following safely on every run:

1. Finds the latest `.dump` in `backups/`.
2. Drops and recreates test DB `adeera_test_restore`.
3. Restores the backup with `pg_restore`.
4. Runs sanity checks:
- there are public tables
- `_prisma_migrations` exists
- `_prisma_migrations` has rows

If any step fails, the script exits with code `1` and writes failure details to `backups/backup.log`.

Optional override in `.env`:

```env
BACKUP_TEST_DB_NAME=adeera_test_restore
```

## Prerequisites

The PostgreSQL CLI tools must be available in PATH:
- `pg_dump`
- `pg_restore`
- `psql`

On Windows, these usually come with PostgreSQL installation (`.../PostgreSQL/<version>/bin`).

## Windows Task Scheduler Setup

### One-command installer (from backend root)

Run this from `backend/`:

```bash
npm run backup:schedule
```

Default values:
- Task name: `AdeeraDatabaseBackupDaily`
- Daily time: `03:00`

To customize, run the wrapper script directly:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-backup-task.ps1 -TaskName "AdeeraDatabaseBackupDaily" -Time "02:30"
```

### Option A: Helper Script (recommended)

From `backend/` PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-backup-task.ps1 -TaskName "AdeeraDatabaseBackupDaily" -Time "03:00"
```

This creates/updates a daily task running:

```text
npm run backup:daily
```

### Option B: Manual Task Scheduler Steps (fallback)

1. Open **Task Scheduler**.
2. Click **Create Task**.
3. On **General** tab:
- Name: `AdeeraDatabaseBackupDaily`
- Select your local user account.
- Choose **Run only when user is logged on** (simple local dev setup).
4. On **Triggers** tab:
- New trigger: **Daily**
- Start time: pick your preferred backup time (for example `03:00`).
5. On **Actions** tab:
- Action: **Start a program**
- Program/script: `cmd.exe`
- Add arguments:
  `/c cd /d "C:\Users\mikek\Desktop\projects\SaaS Platform\backend" && npm run backup:daily`
6. On **Settings** tab:
- Enable **Run task as soon as possible after a scheduled start is missed**.
7. Save task and run it once manually using **Run** to verify.

## Emergency Manual Restore (Specific Backup File)

Use this when you need to restore a chosen backup into your working database.

1. Stop backend processes that might write to the DB.
2. Pick a backup file in `backend/backups/`.
3. In terminal at `backend/`, restore with:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "%DATABASE_URL%" backups\adeera_backup_2026-07-13_0300.dump
```

If `%DATABASE_URL%` is not available in your shell environment, either:
- open a shell that loads `.env`, or
- pass equivalent host/user/db connection options to `pg_restore`.

4. Restart backend and verify core flows (login, dashboard loads, recent transactions visible).
5. Keep the backup file until functional checks pass.

## Suggested Local Workflow

1. `npm run backup` (on-demand backup)
2. `npm run backup:test-restore` (validates backup is restorable)
3. `npm run backup:cleanup` (retention maintenance)
4. Schedule `npm run backup:daily` in Task Scheduler for unattended daily backups
