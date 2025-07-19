import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(body: any, req: any): Promise<{
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
    updatePermissions(id: string, body: {
        permissions: {
            key: string;
            note?: string;
        }[];
    }, req: any): Promise<({
        permissions: ({
            permission: {
                id: string;
                key: string;
                description: string | null;
            };
        } & {
            id: string;
            userId: string;
            permissionId: string;
            grantedBy: string | null;
            grantedAt: Date | null;
            note: string | null;
        })[];
    } & {
        id: string;
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    getUserPermissions(id: string, req: any): Promise<({
        permission: {
            id: string;
            key: string;
            description: string | null;
        };
    } & {
        id: string;
        userId: string;
        permissionId: string;
        grantedBy: string | null;
        grantedAt: Date | null;
        note: string | null;
    })[]>;
    deleteUser(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
