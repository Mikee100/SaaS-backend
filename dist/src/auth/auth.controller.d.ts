import { AuthService } from './auth.services';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private readonly logger;
    login(body: {
        email: string;
        password: string;
    }, req: any): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            tenantId: string;
            branchId: string | null;
            roles: any[];
            permissions: string[];
        };
    }>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    resetPassword(body: {
        token: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
