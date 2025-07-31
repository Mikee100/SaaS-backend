import { Strategy } from 'passport-jwt';
import { ConfigurationService } from '../config/configuration.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configurationService;
    constructor(configurationService: ConfigurationService);
    onModuleInit(): Promise<void>;
    validate(payload: any): Promise<{
        id: any;
        email: any;
        tenantId: any;
        roles: any;
    }>;
}
export {};
