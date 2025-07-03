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
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getUsers(tenantId: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getProtected(req: any): {
        message: string;
        user: any;
    };
    updateUser(req: any, id: string, body: {
        name?: string;
        role?: string;
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteUser(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
