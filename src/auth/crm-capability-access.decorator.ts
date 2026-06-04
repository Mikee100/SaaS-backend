import { SetMetadata } from '@nestjs/common';
import type { CrmCapabilityKey } from './crm-entitlements.constants';

export const CRM_CAPABILITY_ACCESS_KEY = 'crmCapabilityAccess';

export const RequireCrmCapabilities = (...capabilities: CrmCapabilityKey[]) =>
  SetMetadata(CRM_CAPABILITY_ACCESS_KEY, capabilities);
