import { AuthService } from './auth.services';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
            roles: {
                id: string;
                roleId: string;
                permissionId: string;
            }[][];
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
