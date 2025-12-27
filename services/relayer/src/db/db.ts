import { Pool } from 'pg';

const pool = new Pool({
    // Replace with your PostgreSQL connection details
    user: 'user',
    host: 'localhost',
    database: 'relayer',
    password: 'password',
    port: 5432,
});

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

const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        await client.query("CREATE TABLE IF NOT EXISTS sessions (sessionKey TEXT, expiration INTEGER)");
        await client.query("CREATE TABLE IF NOT EXISTS users (address TEXT)");
        await client.query("CREATE TABLE IF NOT EXISTS chain (id INTEGER)");
        await client.query('CREATE TABLE IF NOT EXISTS orders (id TEXT, user TEXT, tokenIn TEXT, tokenOut TEXT, amountIn TEXT, minAmountOut TEXT, nonce INTEGER, status TEXT, symbol TEXT, side TEXT, price TEXT, amount TEXT, total TEXT, createdAt INTEGER)');

        // Clear existing data before inserting new data
        await client.query("DELETE FROM users");
        await client.query("DELETE FROM chain");

        await client.query("INSERT INTO users (address) VALUES ('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')");
        await client.query("INSERT INTO chain (id) VALUES (1337)");
    } catch (err) {
        console.error("Error initializing database:", err);
    } finally {
        client.release();
    }
};

initializeDatabase();

export const getChainId = async (): Promise<string> => {
    try {
        const res = await pool.query("SELECT id FROM chain");
        if (res.rows.length > 0) {
            return res.rows[0].id;
        } else {
            throw new Error("Chain ID not found in database.");
        }
    } catch (err) {
        console.error("Error getting chain ID from DB:", err);
        throw new Error("Failed to get chain ID from database.");
    }
};

export const getUserAddress = async (): Promise<string> => {
    try {
        const res = await pool.query("SELECT address FROM users");
        if (res.rows.length > 0) {
            return res.rows[0].address;
        } else {
            throw new Error("User address not found in database.");
        }
    } catch (err) {
        console.error("Error getting user address from DB:", err);
        throw new Error("Failed to get user address from database.");
    }
};

export const saveSession = async (sessionKey: string, expiration: number): Promise<void> => {
    try {
        await pool.query("INSERT INTO sessions (sessionKey, expiration) VALUES ($1, $2)", [sessionKey, expiration]);
    } catch (err) {
        console.error("Error saving session to DB:", err);
        throw new Error("Failed to save session to database.");
    }
};

export const getOrders = async (address: string): Promise<Order[]> => {
    try {
        const res = await pool.query("SELECT * FROM orders WHERE user = $1", [address]);
        return res.rows;
    } catch (err) {
        console.error("Error getting orders from DB:", err);
        throw new Error("Failed to get orders from database.");
    }
};

export const saveOrder = async (intent: any): Promise<void> => {
    const { id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce } = intent;
    const status = "PENDING"; 
    const createdAt = Math.floor(Date.now() / 1000);
    
    try {
        await pool.query(
            "INSERT INTO orders (id, user, tokenIn, tokenOut, amountIn, minAmountOut, nonce, status, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [id, user, tokenIn, tokenOut, amountIn.toString(), minAmountOut.toString(), nonce, status, createdAt]
        );
    } catch (err) {
        console.error("Error saving order to DB:", err);
        throw new Error("Failed to save order to database.");
    }
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
    try {
        await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);
    } catch (err) {
        console.error("Error updating order status in DB:", err);
        throw new Error("Failed to update order status in database.");
    }
};
