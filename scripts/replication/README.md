# Local PostgreSQL Replication Learning Lab (Primary + Standby)

This folder is a sandbox for learning PostgreSQL streaming replication on one Windows machine.
It is intentionally separate from application runtime wiring.

## Important Scope Note

This setup is for practice only.
It is **not** connected to the backend application's `DATABASE_URL` failover logic.
No application connection behavior is changed here.

## Backups vs Replication (plain language)

- Backups (already implemented) protect your data history. If something is deleted or corrupted, a backup helps you recover old state.
- Replication keeps another server nearly in sync in real time so you can reduce downtime after a failure.
- You need both in real systems. Replication helps uptime. Backups help data safety and recovery depth.

## What This Lab Creates

- Primary instance: your existing PostgreSQL instance (usually on port 5432).
- Standby instance: second local data directory, default `backend/pgdata_standby`, running on port 5433.
- Replication stream: standby continuously receives WAL changes from primary.
- Failover practice: manually promote standby to writable mode.
- Reset procedure: rebuild standby from primary for repeated practice.

## Prerequisites

1. PostgreSQL tools in PATH, or set `PG_BIN` to your PostgreSQL bin folder:
- `psql`
- `pg_ctl`
- `pg_basebackup`

2. `backend/.env` exists with `DATABASE_URL`.

3. Add replication secret in local `backend/.env` (never commit secrets):

```
PG_REPLICATION_PASSWORD=change_me_locally
PG_REPLICATION_USER=replicator
PG_STANDBY_PORT=5433
```

Optional if you use pg_ctl for primary lifecycle too:

```
PG_PRIMARY_DATA_DIR=C:/path/to/your/primary/data/directory
```

## Step 1: Find primary config file paths

Run:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\show-primary-config-paths.ps1
```

This shows:
- `config_file` (postgresql.conf)
- `hba_file` (pg_hba.conf)

## Step 2: Configure primary for replication

Automated option (recommended first):

```
npm run replication:apply-primary-config
```

This safely:
- discovers `postgresql.conf` and `pg_hba.conf`
- creates timestamped backup copies of both files
- appends replication settings/rules only if they are missing

Use these snippets as source-of-truth examples:
- `scripts/replication/snippets/primary-postgresql.conf.snippet`
- `scripts/replication/snippets/primary-pg_hba.conf.snippet`

Apply those lines to your actual primary config files.

Why each setting matters:
- `wal_level = replica`: includes enough WAL detail for standby replay.
- `max_wal_senders = 3`: allows WAL sender processes for standby connections.
- `wal_keep_size = 512MB`: keeps enough recent WAL so short standby outages can catch up.
- `pg_hba.conf` replication entries: explicitly permit local replication login for dedicated role.

Then restart primary PostgreSQL so config changes take effect.

## Step 3: Create dedicated replication role

Run:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\create-replication-role.ps1
```

This creates or updates role `replicator` with REPLICATION + LOGIN using `PG_REPLICATION_PASSWORD`.

## Step 4: Build standby from base backup

Run:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\init-standby.ps1 -Reinitialize
```

This uses `pg_basebackup` with `-R` to:
- clone primary data into standby directory
- create `standby.signal`
- write `primary_conninfo` automatically

Equivalent core command pattern:

```
pg_basebackup -h <primary_host> -p <primary_port> -U replicator -D <standby_data_dir> -Fp -Xs -P -R
```

## Step 5: Start and stop each instance independently

Primary (only if you manage primary with pg_ctl):

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\start-primary.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\replication\stop-primary.ps1
```

Standby:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\start-standby.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\replication\stop-standby.ps1
```

Direct pg_ctl equivalents:

```
pg_ctl -D <primary_data_dir> -l <primary_log_file> -o "-p 5432" start
pg_ctl -D <primary_data_dir> stop -m fast

pg_ctl -D <standby_data_dir> -l <standby_log_file> -o "-p 5433" start
pg_ctl -D <standby_data_dir> stop -m fast
```

## Step 6: Verify replication is live

Automated learning check:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\verify-replication.ps1
```

This script:
1. Writes/updates a probe row on primary.
2. Reads probe row on standby.
3. Checks `pg_stat_replication` on primary.
4. Checks `pg_stat_wal_receiver` on standby.
5. Attempts a write on standby and expects rejection.

Manual SQL checks:

On primary:

```
SELECT application_name, client_addr, state, sync_state, write_lag, flush_lag, replay_lag
FROM pg_stat_replication;
```

On standby:

```
SELECT status, receive_start_lsn, written_lsn, flushed_lsn, latest_end_lsn, latest_end_time
FROM pg_stat_wal_receiver;
```

## Step 7: Practice promotion (simulated failover)

Promote standby:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\promote-standby.ps1
```

After promotion:
- `pg_is_in_recovery()` on standby should return `false`.
- Writes on former standby should succeed.

## Step 8: Reset back to clean primary + standby pair

After a promotion test, rebuild standby from current primary by re-running base backup:

```
powershell -ExecutionPolicy Bypass -File .\scripts\replication\reset-replication.ps1
```

This script:
1. Stops standby (if running).
2. Reinitializes standby data dir with fresh base backup.
3. Starts standby again on port 5433.

## Verification Checklist

Use this quick checklist each time:

1. `pg_stat_replication` on primary shows one row with `state = streaming`.
2. `pg_stat_wal_receiver` on standby shows active receiver status.
3. Probe write on primary appears on standby within a few seconds.
4. Write on standby is rejected while it is still a standby.
5. After promotion, write on standby succeeds.
6. After reset, standby returns to read-only and streaming resumes.

## Safety Notes

- Keep `PG_REPLICATION_PASSWORD` only in local `.env` or process environment.
- Do not reuse app DB role as replication role.
- Keep this lab isolated from production assumptions.
- This lab is for understanding behavior, not production-grade HA design.
