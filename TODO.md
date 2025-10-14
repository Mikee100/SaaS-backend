# Branch Switching Restriction Task

## Steps to Complete
- [x] Update backend/src/branch/branch.controller.ts: Change switchBranch permission to only allow 'owner' role
- [x] Update SaaS-frontend/src/components/dashboard/BranchSelector.tsx: Restrict rendering to only 'owner' role
- [x] Update SaaS-frontend/src/app/ClientLayout.tsx: Restrict canChangeBranch to only 'owner'
- [x] Test the changes to ensure owners can switch branches smoothly and non-owners cannot see the selector
