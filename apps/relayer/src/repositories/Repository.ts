import { Order } from "../models/order";

export interface Repository {
  getChainId(): Promise<number>;
  getUserAddress(): Promise<string>;
  saveSession(sessionKey: string, expiration: number): Promise<void>;
  getOrders(address: string): Promise<Order[]>;
  saveOrder(intent: any): Promise<void>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
}
