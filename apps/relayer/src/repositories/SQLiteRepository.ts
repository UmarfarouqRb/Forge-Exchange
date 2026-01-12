import { Order } from "../models/order";
import { Repository } from "./Repository";
import sqlite3 from "sqlite3";

const DB_PATH = "./database.db";

export class SQLiteRepository implements Repository {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database", err);
      } else {
        this.initializeDatabase();
      }
    });
  }

  private initializeDatabase() {
    this.db.serialize(() => {
      this.db.run(
        "CREATE TABLE IF NOT EXISTS sessions (sessionKey TEXT, expiration INTEGER)"
      );
      this.db.run("CREATE TABLE IF NOT EXISTS users (address TEXT)");
      this.db.run("CREATE TABLE IF NOT EXISTS chain (id INTEGER)");
      this.db.run(
        "CREATE TABLE IF NOT EXISTS orders (id TEXT, user TEXT, tokenIn TEXT, tokenOut TEXT, amountIn TEXT, minAmountOut TEXT, nonce INTEGER, status TEXT, symbol TEXT, side TEXT, price TEXT, amount TEXT, total TEXT, createdAt INTEGER)"
      );
      this.db.run("DELETE FROM users");
      this.db.run("DELETE FROM chain");
      this.db.run(
        "INSERT INTO users (address) VALUES ('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')"
      );
      this.db.run("INSERT INTO chain (id) VALUES (1337)");
    });
  }

  getChainId(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT id FROM chain", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve((row as any).id);
        }
      });
    });
  }

  getUserAddress(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT address FROM users", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve((row as any).address);
        }
      });
    });
  }

  saveSession(sessionKey: string, expiration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO sessions (sessionKey, expiration) VALUES (?, ?)",
        [sessionKey, expiration],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  getOrders(address: string): Promise<Order[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM orders WHERE user = ?",
        [address],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Order[]);
          }
        }
      );
    });
  }

  getOrdersByMarket(market: string): Promise<Order[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM orders WHERE symbol = ? AND status = 'OPEN'",
        [market],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Order[]);
          }
        }
      );
    });
  }

  saveOrder(intent: any): Promise<void> {
    const { id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, symbol, side, price, amount, total } = intent;
    const status = "OPEN";
    const createdAt = Math.floor(Date.now() / 1000);

    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO orders (id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, status, symbol, side, price, amount, total, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          user,
          tokenIn,
          tokenOut,
          amountIn.toString(),
          minAmountOut.toString(),
          nonce,
          status,
          symbol,
          side,
          price,
          amount,
          total,
          createdAt,
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  updateOrderStatus(orderId: string, status: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, orderId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}
