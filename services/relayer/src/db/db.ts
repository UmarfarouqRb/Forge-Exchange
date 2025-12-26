import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db/database.sqlite');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS sessions (sessionKey TEXT, expiration INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS users (address TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS chain (id INTEGER)");
    db.run('CREATE TABLE IF NOT EXISTS orders (id TEXT, user TEXT, tokenIn TEXT, tokenOut TEXT, amountIn TEXT, minAmountOut TEXT, nonce INTEGER, status TEXT, symbol TEXT, side TEXT, price TEXT, amount TEXT, total TEXT, createdAt INTEGER)');

    db.run("INSERT INTO users (address) VALUES ('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')");
    db.run("INSERT INTO chain (id) VALUES (1337)");
});

export const getChainId = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM chain", (err, row: any) => {
            if (err) {
                reject(err);
            }
            resolve(row.id);
        });
    });
};

export const getUserAddress = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        db.get("SELECT address FROM users", (err, row: any) => {
            if (err) {
                reject(err);
            }
            resolve(row.address);
        });
    });
};

export const saveSession = async (sessionKey: string, expiration: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO sessions (sessionKey, expiration) VALUES (?, ?)", [sessionKey, expiration], (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

export const getOrders = async (address: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM orders WHERE user = ?", [address], (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
};

export const saveOrder = async (intent: any): Promise<void> => {
    const { id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce } = intent;
    // NOTE: The other fields (status, symbol, etc.) are not part of the core intent
    // and would be added based on context or execution results.
    const status = "PENDING"; 
    const createdAt = Math.floor(Date.now() / 1000);
    
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO orders (id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, user, tokenIn, tokenOut, amountIn.toString(), minAmountOut.toString(), nonce, status, createdAt], 
            (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            }
        );
    });
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};
