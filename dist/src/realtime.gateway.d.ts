import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
export declare class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    afterInit(server: Server): void;
    handleConnection(client: any): void;
    handleDisconnect(client: any): void;
    emitSalesUpdate(data: any): void;
    emitInventoryUpdate(data: any): void;
    emitNotification(data: any): void;
}
