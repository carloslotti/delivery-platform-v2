import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`✓ ${client.id} conectado`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`× ${client.id} desconectado`);
  }

  @SubscribeMessage('join_tenant')
  handleJoinTenant(@ConnectedSocket() client: Socket, @MessageBody() data: { tenantId: string }) {
    if (!data?.tenantId) return { ok: false };
    client.join(`tenant:${data.tenantId}`);
    return { ok: true };
  }

  @SubscribeMessage('join_delivery')
  handleJoinDelivery(@ConnectedSocket() client: Socket, @MessageBody() data: { deliveryId: string }) {
    if (!data?.deliveryId) return { ok: false };
    client.join(`delivery:${data.deliveryId}`);
    return { ok: true };
  }

  @SubscribeMessage('join_tracking')
  handleJoinTracking(@ConnectedSocket() client: Socket, @MessageBody() data: { trackingToken: string }) {
    if (!data?.trackingToken) return { ok: false };
    client.join(`track:${data.trackingToken}`);
    return { ok: true };
  }

  @SubscribeMessage('join_driver')
  handleJoinDriver(@ConnectedSocket() client: Socket, @MessageBody() data: { driverId: string }) {
    if (!data?.driverId) return { ok: false };
    client.join(`driver:${data.driverId}`);
    return { ok: true };
  }

  // ============ chamado pelos services ============

  emitDriverLocation(payload: {
    driverId: string;
    deliveryId?: string;
    trackingToken?: string;
    tenantId?: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  }) {
    const data = {
      driverId: payload.driverId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: Date.now(),
    };
    if (payload.deliveryId) this.server.to(`delivery:${payload.deliveryId}`).emit('driver_location', data);
    if (payload.trackingToken) this.server.to(`track:${payload.trackingToken}`).emit('driver_location', data);
    if (payload.tenantId) this.server.to(`tenant:${payload.tenantId}`).emit('driver_location', data);
  }

  emitDeliveryStatusChanged(payload: {
    tenantId: string;
    deliveryId: string;
    trackingToken: string;
    status: string;
    delivery: any;
  }) {
    const data = { deliveryId: payload.deliveryId, status: payload.status, delivery: payload.delivery };
    this.server.to(`tenant:${payload.tenantId}`).emit('delivery_status_changed', data);
    this.server.to(`delivery:${payload.deliveryId}`).emit('delivery_status_changed', data);
    this.server.to(`track:${payload.trackingToken}`).emit('delivery_status_changed', data);
  }

  emitDeliveryCreated(payload: { tenantId: string; delivery: any }) {
    this.server.to(`tenant:${payload.tenantId}`).emit('delivery_created', payload.delivery);
  }

  emitDeliveryOffered(payload: { driverId: string; delivery: any }) {
    this.server.to(`driver:${payload.driverId}`).emit('delivery_offered', payload.delivery);
  }

  emitDeliveryAssigned(payload: {
    tenantId: string;
    deliveryId: string;
    trackingToken: string;
    driver: any;
  }) {
    this.server.to(`tenant:${payload.tenantId}`).emit('delivery_assigned', payload);
    this.server.to(`delivery:${payload.deliveryId}`).emit('delivery_assigned', payload);
    this.server.to(`track:${payload.trackingToken}`).emit('delivery_assigned', payload);
  }
}
