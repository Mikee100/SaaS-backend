import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // ...existing code...
  }

  handleConnection(client: any) {
    // ...existing code...
  }

  handleDisconnect(client: any) {
    // ...existing code...
  }

  // Emit sales update to all clients
  emitSalesUpdate(data: any) {
    this.server.emit('salesUpdate', data);
  }

  // Emit inventory update to all clients
  emitInventoryUpdate(data: any) {
    this.server.emit('inventoryUpdate', data);
  }

  // Emit notification to all clients
  emitNotification(data: any) {
    this.server.emit('notification', data);
  }
}
