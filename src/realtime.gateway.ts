import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface SocketAuthPayload {
  sub?: string;
  tenantId?: string | null;
  branchId?: string | null;
}

function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

function branchRoom(tenantId: string, branchId: string): string {
  return `tenant:${tenantId}:branch:${branchId}`;
}

@WebSocketGateway({ cors: true })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(_server: Server) {
    void _server;
    // ...existing code...
  }

  // Clients must authenticate with the same access token used for HTTP requests
  // (handshake.auth.token or Authorization header) and are scoped to their
  // tenant/branch rooms only. Unauthenticated or cross-tenant broadcasts are
  // never sent on the restaurant order channel (see emitRestaurantOrderEvent).
  handleConnection(client: Socket) {
    const authToken = client.handshake.auth?.token as string | undefined;
    const headerAuth = client.handshake.headers?.authorization;
    const bearerToken =
      typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')
        ? headerAuth.slice('Bearer '.length).trim()
        : undefined;
    const token = authToken || bearerToken;

    if (!token) {
      this.logger.warn(`Rejecting socket ${client.id}: no auth token provided`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<SocketAuthPayload>(token, {
        secret: process.env.JWT_SECRET || 'waweru',
      });

      if (!payload.tenantId) {
        this.logger.warn(
          `Rejecting socket ${client.id}: token has no tenant context`,
        );
        client.disconnect(true);
        return;
      }

      const branchId =
        payload.branchId ||
        (client.handshake.auth?.branchId as string | undefined);

      client.data.tenantId = payload.tenantId;
      client.data.branchId = branchId || null;
      void client.join(tenantRoom(payload.tenantId));
      if (branchId) {
        void client.join(branchRoom(payload.tenantId, branchId));
      }
    } catch (error) {
      this.logger.warn(
        `Rejecting socket ${client.id}: invalid or expired token`,
      );
      client.disconnect(true);
    }
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

  // Emit a restaurant order lifecycle event to the owning tenant+branch room only
  emitRestaurantOrderEvent(
    tenantId: string,
    branchId: string,
    event: {
      type: 'created' | 'statusChanged' | 'itemsAdded';
      orderId: string;
      status?: string;
      order?: unknown;
    },
  ) {
    this.server
      .to(branchRoom(tenantId, branchId))
      .emit('restaurantOrderEvent', event);
  }
}
