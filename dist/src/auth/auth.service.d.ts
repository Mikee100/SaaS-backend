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
            userId: string;
            roleId: string;
        } | {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[] | ({
            id: string;
            createdAt: Date;
            tenantId: string;
            branchId: string | null;
            userId: string;
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
            branchId: string | null;
            userId: string;
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
            updatedAt: Date;
            tenantId: string;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            merchantRequestId: string | null;
            checkoutRequestID: string | null;
            mpesaReceipt: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleId: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            transactionType: string | null;
            transactionTime: Date | null;
            businessShortCode: string | null;
            billRefNumber: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            thirdPartyTransID: string | null;
        } | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            merchantRequestId: string | null;
            checkoutRequestID: string | null;
            mpesaReceipt: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleId: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            transactionType: string | null;
            transactionTime: Date | null;
            businessShortCode: string | null;
            billRefNumber: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            thirdPartyTransID: string | null;
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
            tenantId: string;
            branchId: string;
            userId: string;
            roleId: string;
        } | {
            id: string;
            tenantId: string;
            branchId: string;
            userId: string;
            roleId: string;
        })[] | ({
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
        } | {
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
        })[] | ({
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            readAt: Date | null;
        } | {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            readAt: Date | null;
        })[] | ({
            id: string;
            tenantId: string;
            userId: string;
            permissionId: string;
        } | {
            id: string;
            tenantId: string;
            userId: string;
            permissionId: string;
        })[] | {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        }[] | {
            id: string;
            createdAt: Date;
            tenantId: string;
            branchId: string | null;
            userId: string;
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
            updatedAt: Date;
            tenantId: string;
            userId: string | null;
            phoneNumber: string;
            amount: number;
            status: string;
            merchantRequestId: string | null;
            checkoutRequestID: string | null;
            mpesaReceipt: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            message: string | null;
            saleId: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            transactionType: string | null;
            transactionTime: Date | null;
            businessShortCode: string | null;
            billRefNumber: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            thirdPartyTransID: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ip: string | null;
        }[] | {
            id: string;
            tenantId: string;
            branchId: string;
            userId: string;
            roleId: string;
        }[] | {
            id: string;
            tenantId: string;
            userId: string;
            status: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
        }[] | {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            readAt: Date | null;
        }[] | {
            id: string;
            tenantId: string;
            userId: string;
            permissionId: string;
        }[];
        [x: number]: never;
        [x: symbol]: never;
        id: string;
        email: string;
        name: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
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
            roles: any[];
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
