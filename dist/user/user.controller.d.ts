import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(body: {
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
    }>;
    getUsers(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
    }[]>;
    getProtected(req: any): {
        message: string;
        user: any;
    };
}
