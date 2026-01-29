
import { EventEmitter } from 'events';
import {
    Token, InsertToken,
    TradingPair, InsertTradingPair,
    Market, InsertMarket,
    Order, InsertOrder,
} from "@forge/db";
import { randomUUID } from "crypto";

// --- TYPE DEFINITIONS ---

// Standardize OrderBook to use [price, quantity] tuples
export type OrderBook = {
  bids: [string, string][];
  asks: [string, string][];
};

// --- MOCK DATA STORE ---

class MockDataStore extends EventEmitter {
  public tokens = new Map<string, Token>();
  public tradingPairs = new Map<string, TradingPair>();
  public markets = new Map<string, Market>(); // Keyed by tradingPairId
  public orders = new Map<string, Order>();

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockTokens: InsertToken[] = [
      { name: "Bitcoin", symbol: "BTC", decimals: 8, chainId: 1, address: '0xbtc-address' },
      { name: "Ethereum", symbol: "ETH", decimals: 18, chainId: 1, address: '0xeth-address' },
      { name: "Tether", symbol: "USDT", decimals: 6, chainId: 1, address: '0xusdt-address' },
    ];

    for (const token of mockTokens) {
        const id = randomUUID();
        this.tokens.set(token.symbol, { ...token, id, createdAt: new Date(), name: token.name ?? token.symbol });
    }

    const pairsToCreate: [string, string][] = [["BTC", "USDT"],["ETH", "USDT"]];
    const initialMarketData: { [symbol: string]: Omit<InsertMarket, 'tradingPairId'> } = {
        "BTCUSDT": { lastPrice: "68000.50" },
        "ETHUSDT": { lastPrice: "3400.00" },
    };

    for (const [baseSymbol, quoteSymbol] of pairsToCreate) {
      const baseToken = Array.from(this.tokens.values()).find(t => t.symbol === baseSymbol);
      const quoteToken = Array.from(this.tokens.values()).find(t => t.symbol === quoteSymbol);
      const symbol = `${baseSymbol}${quoteSymbol}`;

      if (baseToken && quoteToken) {
        const pairId = randomUUID();
        this.tradingPairs.set(symbol, { id: pairId, symbol: symbol, baseTokenId: baseToken.id, quoteTokenId: quoteToken.id, isActive: true, createdAt: new Date() });
        const marketData = initialMarketData[symbol];
        if (marketData) {
            this.markets.set(pairId, { tradingPairId: pairId, lastPrice: marketData.lastPrice ?? null, volume24h: '0', high24h: '0', low24h: '0', updatedAt: new Date() });
        }
        this.createMockOrderBook(pairId, parseFloat(marketData.lastPrice!));
      }
    }
  }

  private createMockOrderBook(tradingPairId: string, basePrice: number): void {
    for (let i = 1; i <= 10; i++) {
      this.createMockOrder(tradingPairId, "buy", basePrice - i * 0.5, 1 + i * 0.1);
      this.createMockOrder(tradingPairId, "sell", basePrice + i * 0.5, 1 + i * 0.1);
    }
  }

  private createMockOrder(tradingPairId: string, side: 'buy' | 'sell', price: number, quantity: number): void {
    const id = randomUUID();
    const order: Order = { id, tradingPairId, side, price: price.toFixed(2), quantity: quantity.toFixed(4), userAddress: `0xmock-user-${randomUUID()}`, status: "open", filledQuantity: "0", createdAt: new Date() };
    this.orders.set(id, order);
  }

  public getOrderBook(tradingPairId: string): OrderBook {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    for (const order of this.orders.values()) {
      if (order.tradingPairId === tradingPairId && order.status === 'open') {
        // Ensure data is returned as a tuple
        const orderTuple: [string, string] = [order.price, order.quantity];
        if (order.side === 'buy') {
          bids.push(orderTuple);
        } else {
          asks.push(orderTuple);
        }
      }
    }

    bids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
    asks.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

    return { bids, asks };
  }
}

export const mockDB = new MockDataStore();
