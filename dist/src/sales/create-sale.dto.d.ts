declare class SaleItemDto {
    productId: string;
    quantity: number;
    price?: number;
}
export declare class CreateSaleDto {
    items: SaleItemDto[];
    paymentMethod: string;
    amountReceived?: number;
    customerName?: string;
    customerPhone?: string;
    idempotencyKey: string;
    branchId?: string;
    total?: number;
    vatAmount?: number;
    mpesaTransactionId?: string;
}
export {};
