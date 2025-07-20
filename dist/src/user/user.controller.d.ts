import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(body: any, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
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
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
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
