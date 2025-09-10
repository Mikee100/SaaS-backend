export declare class CustomerResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: Date;
    gender?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    totalPurchases?: number;
    totalSpent?: number;
    loyaltyPoints?: number;
}
