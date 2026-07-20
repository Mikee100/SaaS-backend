import { ForbiddenException } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { AuthenticatedRequest } from '../auth/request.types';

function buildRequest(overrides: {
  role?: string;
  branchId?: string;
  queryBranchId?: string;
  headerBranchId?: string;
} = {}): AuthenticatedRequest {
  return {
    user: {
      role: overrides.role,
      branchId: overrides.branchId,
      tenantId: 'tenant-1',
      userId: 'user-1',
    },
    headers: overrides.headerBranchId
      ? { 'x-branch-id': overrides.headerBranchId }
      : {},
    query: overrides.queryBranchId ? { branchId: overrides.queryBranchId } : {},
  } as unknown as AuthenticatedRequest;
}

describe('LedgerController.resolveBranchScope', () => {
  let controller: LedgerController;

  beforeEach(() => {
    const ledgerServiceMock = {} as unknown as LedgerService;
    controller = new LedgerController(ledgerServiceMock);
  });

  const resolve = (req: AuthenticatedRequest): string | undefined =>
    (controller as any).resolveBranchScope(req);

  it('throws ForbiddenException for a manager with no assigned branch', () => {
    const req = buildRequest({ role: 'manager' });
    expect(() => resolve(req)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for a cashier with no assigned branch', () => {
    const req = buildRequest({ role: 'cashier' });
    expect(() => resolve(req)).toThrow(ForbiddenException);
  });

  it('forces a manager to their own assigned branch even if a different branch is requested (anti-leak)', () => {
    const req = buildRequest({
      role: 'manager',
      branchId: 'b1',
      queryBranchId: 'b2',
    });
    expect(resolve(req)).toBe('b1');
  });

  it('forces a cashier to their own assigned branch regardless of the header value', () => {
    const req = buildRequest({
      role: 'cashier',
      branchId: 'b1',
      headerBranchId: 'b2',
    });
    expect(resolve(req)).toBe('b1');
  });

  it('allows a tenant-level role to select an explicit branch via query', () => {
    const req = buildRequest({ role: 'owner', queryBranchId: 'b2' });
    expect(resolve(req)).toBe('b2');
  });

  it('treats "all" as no scope for a tenant-level role', () => {
    const req = buildRequest({ role: 'admin', queryBranchId: 'all' });
    expect(resolve(req)).toBeUndefined();
  });

  it('returns undefined for a tenant-level role with no branch param at all', () => {
    const req = buildRequest({ role: 'owner' });
    expect(resolve(req)).toBeUndefined();
  });

  it('falls back to the x-branch-id header when no query param is present', () => {
    const req = buildRequest({ role: 'owner', headerBranchId: 'b3' });
    expect(resolve(req)).toBe('b3');
  });
});
