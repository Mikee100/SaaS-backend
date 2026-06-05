import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TrialGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    void context;
    // Trial enforcement is intentionally disabled.
    return true;
  }
}
