import { SetMetadata } from '@nestjs/common';
import type { AppModuleKey } from './module-access.constants';

export const MODULE_ACCESS_KEY = 'moduleAccess';

export const RequireModules = (...modules: AppModuleKey[]) =>
  SetMetadata(MODULE_ACCESS_KEY, modules);
