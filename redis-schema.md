# Redis Key Schema for Forge Exchange

This document defines the key naming conventions and data structures for Redis.
This schema supports the "speed layer" of the exchange, handling ephemeral data like order books, caches, and queues.

---

## 1. Key Naming Convention

We will use a consistent, namespaced pattern to prevent key collisions and ensure clarity:

`object-type:{id}:{field}`

- **`object-type`**: The category of the data (e.g., `orderbook`, `price`, `lock`).
- **`{id}`**: The unique identifier for the object (e.g., a trading symbol like `BTC-USDT` or a user address).
- **`{field}`**: The specific attribute of the object (e.g., `bids`, `asks`, `ticker`).

---

## 2. Real-Time Market Data

### Order Books

Used to store and display the live order book for a trading pair. Sorted sets are perfect for this, as they maintain items sorted by a score (price).

- **Key Pattern**: `orderbook:{symbol}:bids`
- **Type**: `Sorted Set (ZSET)`
- **Description**: Stores the buy-side orders. The `score` is the price, and the `member` is the quantity at that price level.

- **Key Pattern**: `orderbook:{symbol}:asks`
- **Type**: `Sorted Set (ZSET)`
- **Description**: Stores the sell-side orders. The `score` is the price, and the `member` is the quantity at that price level.

### Price & Ticker Caches

Used to cache the latest market price, 24h stats, and other ticker information for fast retrieval by the UI.

- **Key Pattern**: `price:ticker:{symbol}`
- **Type**: `Hash (HSET)`
- **Description**: A hash containing fields like `lastPrice`, `high24h`, `low24h`, `volume24h`.

### Chart Data

Caches historical candlestick data to reduce load on PostgreSQL.

- **Key Pattern**: `price:chart:{symbol}:{resolution}`
- **Type**: `List (LPUSH/LRANGE)`
- **Description**: A list where each member is a JSON string representing a single candlestick (`[timestamp, open, high, low, close, volume]`). `{resolution}` could be `1m`, `5m`, `1h`, etc.

---

## 3. Trade Execution & Relaying

### Execution Queue

This is the queue for matched trades that are ready to be processed by an on-chain relayer.

- **Key Pattern**: `queue:trade-execution`
- **Type**: `List (LPUSH/RPOP)`
- **Description**: A simple FIFO queue. The API will `LPUSH` a new trade's details (as a JSON string), and a relayer will `RPOP` it for processing.

### Relayer Locks

Prevents multiple relayers from processing the same order simultaneously.

- **Key Pattern**: `lock:relayer:order:{order-id}`
- **Type**: `String (SET with NX and EX)`
- **Description**: A temporary lock. A relayer will attempt to `SET` this key with the `NX` (Not Exists) option. If successful, it has acquired the lock. An `EX` (expire) is crucial to prevent permanent locks.

---

## 4. User-Specific Caches

### Open Orders

Provides a fast way to retrieve all open orders for a specific user without querying the main database.

- **Key Pattern**: `user:{wallet-address}:open-orders`
- **Type**: `Set (SADD/SREM/SMEMBERS)`
- **Description**: A set containing the `order-id`s of all open orders for a given user.

---

## 5. Rate Limiting

### API Rate Limits

Protects the API from abuse.

- **Key Pattern**: `ratelimit:api:{ip-address}`
- **Type**: `String (INCR with EXPIRE)`
- **Description**: On each request, `INCR` this key. If the count exceeds a threshold within a time window, reject the request. The `EXPIRE` is used to define the window.
