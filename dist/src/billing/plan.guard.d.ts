import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';
export declare const RequirePlan: (plan: string) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const RequireFeature: (feature: string) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare class PlanGuard implements CanActivate {
    private reflector;
    private billingService;
    constructor(reflector: Reflector, billingService: BillingService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
