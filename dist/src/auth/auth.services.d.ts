import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AuditLogService } from '../audit-log.service';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private userService;
    private jwtService;
    private auditLogService;
    private emailService;
    private readonly logger;
    constructor(userService: UserService, jwtService: JwtService, auditLogService: AuditLogService, emailService: EmailService);
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
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            phoneNumber: string;
            amount: number;
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
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            phoneNumber: string;
            amount: number;
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
            userId: string;
            stripeCustomerId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            trialEnd: Date | null;
            trialStart: Date | null;
        } | {
            id: string;
            tenantId: string;
            userId: string;
            stripeCustomerId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
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
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            phoneNumber: string;
            amount: number;
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
            userId: string;
            stripeCustomerId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
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
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        email: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
    } | {
        isActive: boolean;
        id: string;
        name: string;
        tenantId: string | null;
        branchId: string | null;
        email: string;
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
