import { z } from 'zod';
export declare const Order: z.ZodObject<{
    id: z.ZodString;
    user: z.ZodString;
    pair: z.ZodString;
    side: z.ZodEnum<["buy", "sell"]>;
    type: z.ZodEnum<["limit", "market"]>;
    price: z.ZodString;
    amount: z.ZodString;
    filled: z.ZodString;
    status: z.ZodEnum<["open", "filled", "canceled"]>;
    createdAt: z.ZodString;
    symbol: z.ZodString;
    total: z.ZodString;
    leverage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    id: string;
    user: string;
    pair: string;
    side: "buy" | "sell";
    status: "filled" | "open" | "canceled";
    type: "limit" | "market";
    price: string;
    amount: string;
    filled: string;
    createdAt: string;
    total: string;
    leverage?: string | undefined;
}, {
    symbol: string;
    id: string;
    user: string;
    pair: string;
    side: "buy" | "sell";
    status: "filled" | "open" | "canceled";
    type: "limit" | "market";
    price: string;
    amount: string;
    filled: string;
    createdAt: string;
    total: string;
    leverage?: string | undefined;
}>;
export declare const InsertOrder: z.ZodObject<Omit<{
    id: z.ZodString;
    user: z.ZodString;
    pair: z.ZodString;
    side: z.ZodEnum<["buy", "sell"]>;
    type: z.ZodEnum<["limit", "market"]>;
    price: z.ZodString;
    amount: z.ZodString;
    filled: z.ZodString;
    status: z.ZodEnum<["open", "filled", "canceled"]>;
    createdAt: z.ZodString;
    symbol: z.ZodString;
    total: z.ZodString;
    leverage: z.ZodOptional<z.ZodString>;
}, "id" | "status" | "filled" | "createdAt">, "strip", z.ZodTypeAny, {
    symbol: string;
    user: string;
    pair: string;
    side: "buy" | "sell";
    type: "limit" | "market";
    price: string;
    amount: string;
    total: string;
    leverage?: string | undefined;
}, {
    symbol: string;
    user: string;
    pair: string;
    side: "buy" | "sell";
    type: "limit" | "market";
    price: string;
    amount: string;
    total: string;
    leverage?: string | undefined;
}>;
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
}, "strip", z.ZodTypeAny, {
    symbol: string;
    id: string;
    baseAsset: string;
    quoteAsset: string;
    currentPrice: string;
    priceChange24h: string;
    volume24h: string;
    high24h: string;
    low24h: string;
    isFavorite: boolean;
    category: string;
}, {
    symbol: string;
    id: string;
    baseAsset: string;
    quoteAsset: string;
    currentPrice: string;
    priceChange24h: string;
    volume24h: string;
    high24h: string;
    low24h: string;
    isFavorite: boolean;
    category: string;
}>;
export declare const InsertTradingPair: z.ZodObject<Omit<{
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
}, "id">, "strip", z.ZodTypeAny, {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    currentPrice: string;
    priceChange24h: string;
    volume24h: string;
    high24h: string;
    low24h: string;
    isFavorite: boolean;
    category: string;
}, {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    currentPrice: string;
    priceChange24h: string;
    volume24h: string;
    high24h: string;
    low24h: string;
    isFavorite: boolean;
    category: string;
}>;
export declare const MarketData: z.ZodObject<{
    id: z.ZodString;
    symbol: z.ZodString;
    timestamp: z.ZodDate;
    open: z.ZodString;
    high: z.ZodString;
    low: z.ZodString;
    close: z.ZodString;
    volume: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    id: string;
    open: string;
    timestamp: Date;
    high: string;
    low: string;
    close: string;
    volume: string;
}, {
    symbol: string;
    id: string;
    open: string;
    timestamp: Date;
    high: string;
    low: string;
    close: string;
    volume: string;
}>;
export declare const InsertMarketData: z.ZodObject<Omit<{
    id: z.ZodString;
    symbol: z.ZodString;
    timestamp: z.ZodDate;
    open: z.ZodString;
    high: z.ZodString;
    low: z.ZodString;
    close: z.ZodString;
    volume: z.ZodString;
}, "id">, "strip", z.ZodTypeAny, {
    symbol: string;
    open: string;
    timestamp: Date;
    high: string;
    low: string;
    close: string;
    volume: string;
}, {
    symbol: string;
    open: string;
    timestamp: Date;
    high: string;
    low: string;
    close: string;
    volume: string;
}>;
export declare const Asset: z.ZodObject<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    asset: z.ZodString;
    total: z.ZodString;
    available: z.ZodString;
    inOrder: z.ZodString;
    usdValue: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    total: string;
    walletAddress: string;
    asset: string;
    available: string;
    inOrder: string;
    usdValue: string;
}, {
    id: string;
    total: string;
    walletAddress: string;
    asset: string;
    available: string;
    inOrder: string;
    usdValue: string;
}>;
export declare const InsertAsset: z.ZodObject<Omit<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    asset: z.ZodString;
    total: z.ZodString;
    available: z.ZodString;
    inOrder: z.ZodString;
    usdValue: z.ZodString;
}, "id">, "strip", z.ZodTypeAny, {
    total: string;
    walletAddress: string;
    asset: string;
    available: string;
    inOrder: string;
    usdValue: string;
}, {
    total: string;
    walletAddress: string;
    asset: string;
    available: string;
    inOrder: string;
    usdValue: string;
}>;
export declare const Transaction: z.ZodObject<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    type: z.ZodString;
    asset: z.ZodString;
    amount: z.ZodString;
    status: z.ZodString;
    txHash: z.ZodNullable<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: string;
    type: string;
    amount: string;
    timestamp: string;
    walletAddress: string;
    asset: string;
    txHash: string | null;
}, {
    id: string;
    status: string;
    type: string;
    amount: string;
    timestamp: string;
    walletAddress: string;
    asset: string;
    txHash: string | null;
}>;
export declare const InsertTransaction: z.ZodObject<Omit<{
    id: z.ZodString;
    walletAddress: z.ZodString;
    type: z.ZodString;
    asset: z.ZodString;
    amount: z.ZodString;
    status: z.ZodString;
    txHash: z.ZodNullable<z.ZodString>;
    timestamp: z.ZodString;
}, "id">, "strip", z.ZodTypeAny, {
    status: string;
    type: string;
    amount: string;
    timestamp: string;
    walletAddress: string;
    asset: string;
    txHash: string | null;
}, {
    status: string;
    type: string;
    amount: string;
    timestamp: string;
    walletAddress: string;
    asset: string;
    txHash: string | null;
}>;
export declare const AuthorizeSessionPayload: z.ZodObject<{
    sessionKey: z.ZodString;
    expiration: z.ZodNumber;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionKey: string;
    expiration: number;
    signature: string;
}, {
    sessionKey: string;
    expiration: number;
    signature: string;
}>;
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
