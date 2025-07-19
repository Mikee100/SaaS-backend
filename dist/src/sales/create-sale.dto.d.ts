export declare class CreateSaleDto {
    items: {
        productId: string;
        quantity: number;
    }[];
    paymentMethod: string;
    amountReceived: number;
    customerName?: string;
    customerPhone?: string;
}
