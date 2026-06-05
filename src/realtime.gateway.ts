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
  server!: Server;

  afterInit(_server: Server) {
    void _server;
    // ...existing code...
  }

  handleConnection(_client: unknown) {
    void _client;
    // ...existing code...
  }

  handleDisconnect(_client: unknown) {
    void _client;
    // ...existing code...
  }

  // Emit sales update to all clients
  emitSalesUpdate(data: unknown) {
    this.server.emit('salesUpdate', data);
  }

  // Emit inventory update to all clients
  emitInventoryUpdate(data: unknown) {
    this.server.emit('inventoryUpdate', data);
  }

  // Emit ledger update to all clients
  emitLedgerUpdate(data: unknown) {
    this.server.emit('ledgerUpdate', data);
  }

  // Emit notification to all clients
  emitNotification(data: unknown) {
    this.server.emit('notification', data);
  }
}
