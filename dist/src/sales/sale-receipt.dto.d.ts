export declare class SaleReceiptDto {
    saleId: string;
    date: Date;
    items: {
        productId: string;
        name: string;
        price: number;
        quantity: number;
    }[];
    subtotal: number;
    total: number;
    vatAmount: number;
    paymentMethod: string;
    amountReceived: number;
    change: number;
    customerName?: string;
    customerPhone?: string;
}
