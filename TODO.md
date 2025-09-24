# Fix TypeScript Errors in Sales Service

## Task: Fix TypeScript errors in sales.service.ts related to Product model fields

### Issues to Fix:
- [x] Replace `quantity` with `stock` in where clauses (lines 462, 466)
- [x] Remove `minStock` references since field doesn't exist (lines 465-466)
- [x] Fix select statement to use `stock` instead of `quantity` (line 474)
- [x] Fix orderBy clause to use `stock` instead of `quantity` (line 478)
- [x] Fix product update to use `stock` instead of `quantity` (line 101)
- [x] Remove `updatedAt` from Sale create (line 117)
- [ ] Verify TypeScript compilation
- [ ] Test analytics functionality

### Changes Made:
- Updated low stock query to use `stock` field instead of `quantity`
- Removed `minStock` field references
- Simplified logic to check for products with stock < 10
- Updated select and orderBy statements to use correct field names
- Fixed product update logic to use `stock` field
- Removed `updatedAt` from Sale create statement

## Frontend AuthGuard Fix

### Issues to Fix:
- [x] Allow access to authentication pages without redirect
- [x] Fix TypeScript errors in AuthGuard component
- [x] Remove AuthGuard from root page to prevent redirect loop
- [x] Fix UserProvider redirect issue on auth pages
- [x] Remove duplicate UserProvider from LayoutWrapper
- [x] Create AuthPageWrapper to conditionally apply UserProvider
- [x] Test registration flow

### Changes Made:
- Added authPaths check to allow access to `/login`, `/register`, `/forgot-password`, `/reset-password`
- Fixed null checks for user object
- Fixed useUser() call with empty array parameter
- Fixed pathname null checks
- Removed AuthGuard from root page to prevent redirect loop
- Modified UserProvider to not fetch user data on auth pages
- Removed duplicate UserProvider from LayoutWrapper to prevent conflicts
- Created AuthPageWrapper component to conditionally apply UserProvider only on non-auth pages
- Updated ClientLayout to use AuthPageWrapper for proper conditional rendering
