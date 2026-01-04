import { z } from 'zod';
export declare const Order: z.ZodObject<{
    id: z.ZodString;
    user: z.ZodString;
    pair: z.ZodString;
    side: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
    }>;
    type: z.ZodEnum<{
        limit: "limit";
        market: "market";
    }>;
    price: z.ZodString;
    amount: z.ZodString;
    filled: z.ZodString;
    status: z.ZodEnum<{
        filled: "filled";
        open: "open";
        canceled: "canceled";
    }>;
    createdAt: z.ZodString;
    symbol: z.ZodString;
    total: z.ZodString;
    leverage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const InsertOrder: z.ZodObject<{
    symbol: z.ZodString;
    user: z.ZodString;
    pair: z.ZodString;
    side: z.ZodEnum<{
        buy: "buy";
        sell: "sell";
    }>;
    type: z.ZodEnum<{
        limit: "limit";
        market: "market";
    }>;
    price: z.ZodString;
    amount: z.ZodString;
    total: z.ZodString;
    leverage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const TradingPair: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    baseAsset: z.ZodString;
    quoteAsset: z.ZodString;
    currentPrice: z.ZodString;
    priceChange24h: z.ZodString;
    volume24h: z.ZodString;
    high24h: z.ZodString;
    low24h: z.ZodString;
    isFavorite: z.ZodBoolean;
    category: z.ZodString;
}, z.core.$strip>;
export declare const InsertTradingPair: z.ZodObject<{
    symbol: z.ZodString;
    baseAsset: z.ZodString;
    quoteAsset: z.ZodString;
    currentPrice: z.ZodString;
    priceChange24h: z.ZodString;
    volume24h: z.ZodString;
    high24h: z.ZodString;
    low24h: z.ZodString;
    isFavorite: z.ZodBoolean;
    category: z.ZodString;
}, z.core.$strip>;
export declare const MarketData: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    timestamp: z.ZodDate;
    open: z.ZodString;
    high: z.ZodString;
    low: z.ZodString;
    close: z.ZodString;
    volume: z.ZodString;
}, z.core.$strip>;
export declare const InsertMarketData: z.ZodObject<{
    symbol: z.ZodString;
    open: z.ZodString;
    timestamp: z.ZodDate;
    high: z.ZodString;
    low: z.ZodString;
    close: z.ZodString;
    volume: z.ZodString;
}, z.core.$strip>;
export declare const Asset: z.ZodObject<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    asset: z.ZodString;
    total: z.ZodString;
    available: z.ZodString;
    inOrder: z.ZodString;
    usdValue: z.ZodString;
}, z.core.$strip>;
export declare const InsertAsset: z.ZodObject<{
    total: z.ZodString;
    walletAddress: z.ZodString;
    asset: z.ZodString;
    available: z.ZodString;
    inOrder: z.ZodString;
    usdValue: z.ZodString;
}, z.core.$strip>;
export declare const Transaction: z.ZodObject<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    type: z.ZodString;
    asset: z.ZodString;
    amount: z.ZodString;
    status: z.ZodString;
    txHash: z.ZodNullable<z.ZodString>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const InsertTransaction: z.ZodObject<{
    type: z.ZodString;
    amount: z.ZodString;
    status: z.ZodString;
    timestamp: z.ZodString;
    walletAddress: z.ZodString;
    asset: z.ZodString;
    txHash: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const AuthorizeSessionPayload: z.ZodObject<{
    sessionKey: z.ZodString;
    expiration: z.ZodNumber;
    signature: z.ZodString;
}, z.core.$strip>;
export type Order = z.infer<typeof Order>;
export type InsertOrder = z.infer<typeof InsertOrder>;
export type TradingPair = z.infer<typeof TradingPair>;
export type InsertTradingPair = z.infer<typeof InsertTradingPair>;
export type MarketData = z.infer<typeof MarketData>;
export type InsertMarketData = z.infer<typeof InsertMarketData>;
export type Asset = z.infer<typeof Asset>;
export type InsertAsset = z.infer<typeof InsertAsset>;
export type Transaction = z.infer<typeof Transaction>;
export type InsertTransaction = z.infer<typeof InsertTransaction>;
export type AuthorizeSessionPayload = z.infer<typeof AuthorizeSessionPayload>;
