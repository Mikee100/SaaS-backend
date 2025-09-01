declare class SaleItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateSaleDto {
    items: SaleItemDto[];
    paymentMethod: string;
    amountReceived: number;
    customerName?: string;
    customerPhone?: string;
    idempotencyKey: string;
    branchId?: string;
}
export {};
