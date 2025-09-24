import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AuditLogService } from '../audit-log.service';
export declare class AuthService {
    private userService;
    private jwtService;
    private auditLogService;
    constructor(userService: UserService, jwtService: JwtService, auditLogService: AuditLogService);
    validateUser(email: string, password: string): Promise<{
        [x: string]: ({
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        } | {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        })[] | ({
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
            branchId: string;
        } | {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
            branchId: string;
        })[] | ({
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            branchId: string | null;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        } | {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            branchId: string | null;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        })[] | ({
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ip: string | null;
        } | {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ip: string | null;
        })[] | ({
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            billRefNumber: string | null;
            businessShortCode: string | null;
            checkoutRequestID: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            saleId: string | null;
            thirdPartyTransID: string | null;
            transactionId: string | null;
            transactionTime: Date | null;
            transactionType: string | null;
        } | {
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            billRefNumber: string | null;
            businessShortCode: string | null;
            checkoutRequestID: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            saleId: string | null;
            thirdPartyTransID: string | null;
            transactionId: string | null;
            transactionTime: Date | null;
            transactionType: string | null;
        })[] | ({
            id: string;
            createdAt: Date;
            tenantId: string;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        } | {
            id: string;
            createdAt: Date;
            tenantId: string;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        })[] | ({
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            stripeCustomerId: string;
            trialEnd: Date | null;
            trialStart: Date | null;
        } | {
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            stripeCustomerId: string;
            trialEnd: Date | null;
            trialStart: Date | null;
        })[] | ({
            id: string;
            tenantId: string;
            permission: string;
            userId: string;
            grantedBy: string | null;
            grantedAt: Date;
        } | {
            id: string;
            tenantId: string;
            permission: string;
            userId: string;
            grantedBy: string | null;
            grantedAt: Date;
        })[] | {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        }[] | {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
            branchId: string;
        }[] | {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            branchId: string | null;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        }[] | {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ip: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            billRefNumber: string | null;
            businessShortCode: string | null;
            checkoutRequestID: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            saleId: string | null;
            thirdPartyTransID: string | null;
            transactionId: string | null;
            transactionTime: Date | null;
            transactionType: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            tenantId: string;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        }[] | {
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            stripeCustomerId: string;
            trialEnd: Date | null;
            trialStart: Date | null;
        }[] | {
            id: string;
            tenantId: string;
            permission: string;
            userId: string;
            grantedBy: string | null;
            grantedAt: Date;
        }[];
        [x: number]: never;
        [x: symbol]: never;
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string | null;
        updatedAt: Date;
        email: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
        branchId: string | null;
    } | {
        isActive: boolean;
        id: string;
        name: string;
        tenantId: string | null;
        email: string;
        branchId: string | null;
    } | null>;
    login(email: string, password: string, ip?: string): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            tenantId: string;
            branchId: string | null;
            roles: any;
            permissions: string[];
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
