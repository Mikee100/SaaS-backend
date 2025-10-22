declare class SaleItemDto {
    productId: string;
    quantity: number;
    price?: number;
}
export declare class CreateSaleDto {
    items: SaleItemDto[];
    paymentMethod: string;
    amountReceived?: number;
    branchId?: string;
    customerName?: string;
    customerPhone?: string;
    idempotencyKey: string;
    total?: number;
    vatAmount?: number;
    mpesaTransactionId?: string;
    creditAmount?: number;
    creditDueDate?: string;
    creditNotes?: string;
}
export {};
