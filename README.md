# SaaS Platform Backend

NestJS backend for the SaaS Platform. This service is the authoritative enforcement layer for tenant isolation, module access, and capability-based authorization.

## Current Blueprint Rollout Status

This backend currently includes the major Business OS blueprint foundations:

- Manifest registry and resolver for v1 blueprints (fashion, restaurant, spa_barber)
- Effective tenant manifest endpoint
- Superadmin blueprint assignment APIs
- Dry-run preview and rollback APIs for safer rollout operations
- Global capability-aware access checks with stable 403 denial codes
- Unit tests for guard enforcement and admin blueprint rollout flows

Execution backlog and roadmap are tracked in [../docs/BUSINESS_OS_BLUEPRINT_EXECUTION_BACKLOG.md](../docs/BUSINESS_OS_BLUEPRINT_EXECUTION_BACKLOG.md).

## Key Blueprint APIs

Tenant-facing:

- GET /tenant/configurations/manifest/effective

Superadmin-facing:

- GET /admin/blueprints
- GET /admin/tenants/:id/blueprint
- PUT /admin/tenants/:id/blueprint
- POST /admin/tenants/:id/blueprint/preview
- POST /admin/tenants/:id/blueprint/rollback

Module and enforcement context:

- GET /admin/tenants/:id/modules
- PUT /admin/tenants/:id/modules
- GET /admin/tenants/:id/module-permission-matrix

## Authorization and Denial Codes

Global guard enforcement returns stable error codes for blocked requests:

- CAPABILITY_ACCESS_DENIED
- MODULE_ACCESS_DENIED
- CRM_CAPABILITY_ACCESS_DENIED
- CRM_PROVIDER_ACCESS_DENIED
- CRM_LIMIT_REACHED

## Local Development

Install and run:

```bash
npm install
npm run start:dev
```

Build:

```bash
npm run build
```

## Tests

Run all tests:

```bash
npm test
```

Run focused blueprint/guard coverage:

```bash
npm test -- module-access.guard.spec.ts
npm test -- admin.controller.spec.ts
```

## Branch Promotion Flow

Backend repository flow:

- feature/* -> staging -> main

Use compare links in GitHub to create PRs between each stage.
