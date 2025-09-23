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
            branchId: string;
            roleId: string;
            userId: string;
        } | {
            id: string;
            tenantId: string;
            branchId: string;
            roleId: string;
            userId: string;
        })[] | ({
            id: string;
            tenantId: string;
            createdAt: Date;
            branchId: string | null;
            userId: string;
            total: number;
            paymentType: string;
            amountReceived: number | null;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        } | {
            id: string;
            tenantId: string;
            createdAt: Date;
            branchId: string | null;
            userId: string;
            total: number;
            paymentType: string;
            amountReceived: number | null;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        })[] | ({
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
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
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
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
            tenantId: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            message: string;
            type: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        } | {
            id: string;
            tenantId: string;
            createdAt: Date;
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
            permissionId: string;
            userId: string;
        } | {
            id: string;
            tenantId: string;
            permissionId: string;
            userId: string;
        })[] | {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        }[] | {
            id: string;
            tenantId: string;
            branchId: string;
            roleId: string;
            userId: string;
        }[] | {
            id: string;
            tenantId: string;
            createdAt: Date;
            branchId: string | null;
            userId: string;
            total: number;
            paymentType: string;
            amountReceived: number | null;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        }[] | {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
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
            tenantId: string;
            createdAt: Date;
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
            permissionId: string;
            userId: string;
        }[];
        [x: number]: never;
        [x: symbol]: never;
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
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
