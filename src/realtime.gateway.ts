import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket gateway initialized');
  }

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
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