import { Request } from 'express';

export interface AuthenticatedUser {
  userId?: string;
  sub?: string;
  email?: string;
  name?: string;
  roles?: Array<string | { name?: string }>;
  role?: string;
  permissions?: string[];
  tenantId?: string;
  branchId?: string;
  isSuperadmin?: boolean;
  impersonating?: boolean;
  impersonatingTenantName?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
