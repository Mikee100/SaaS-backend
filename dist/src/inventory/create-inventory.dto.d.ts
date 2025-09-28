export declare class CreateInventoryDto {
    productId: string;
    quantity: number;
    branchId?: string;
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    location?: string;
}
