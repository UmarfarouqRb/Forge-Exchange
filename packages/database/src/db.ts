import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export interface Order {
    id: string;
    user: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    nonce: number;
    status: string;
    symbol: string;
    side: string;
    price: string;
    amount: string;
    total: string;
    createdAt: number;
}

export async function openDb() {
  return open({
    filename: './database.db',
    driver: sqlite3.Database
  });
}

export const getChainId = async () => {
    const db = await openDb();
    const result = await db.get("SELECT id FROM chain");
    return result.id;
};

export const getUserAddress = async () => {
    const db = await openDb();
    const result = await db.get("SELECT address FROM users");
    return result.address;
};

export const saveSession = async (sessionKey: string, expiration: number) => {
    const db = await openDb();
    await db.run("INSERT INTO sessions (sessionKey, expiration) VALUES (?, ?)", [sessionKey, expiration]);
};

export const getOrders = async (address: string): Promise<Order[]> => {
    const db = await openDb();
    const results = await db.all("SELECT * FROM orders WHERE user = ?", [address]);
    return results as Order[];
};

export const saveOrder = async (intent: any) => {
    const { id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, side, price, amount, total, symbol } = intent;
    const status = "PENDING"; 
    const createdAt = Math.floor(Date.now() / 1000);
    const db = await openDb();
    await db.run(
        "INSERT INTO orders (id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, status, createdAt, side, price, amount, total, symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, user, tokenIn, tokenOut, amountIn.toString(), minAmountOut.toString(), nonce, status, createdAt, side, price, amount, total, symbol]
    );
};

export const updateOrderStatus = async (orderId: string, status: string) => {
    const db = await openDb();
    await db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
};
