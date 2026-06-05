import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TrialGuard implements CanActivate {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Trial enforcement is intentionally disabled.
    return true;
  }
}
