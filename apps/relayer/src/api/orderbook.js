"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addOrder = exports.getOrderBook = exports.orderBook = void 0;
const engine_1 = require("../matching/engine");
// This is a simplified in-memory order book. In a real-world application, you would use a more robust solution like Redis.
exports.orderBook = {
    bids: [],
    asks: [],
};
const getOrderBook = async (req, res) => {
    res.json(exports.orderBook);
};
exports.getOrderBook = getOrderBook;
const addOrder = async (req, res) => {
    const { order } = req.body;
    if (!order) {
        return res.status(400).json({ error: 'Order data is missing' });
    }
    if (order.side === 'buy') {
        exports.orderBook.bids.push(order);
    }
    else {
        exports.orderBook.asks.push(order);
    }
    res.status(201).json({ success: true });
};
exports.addOrder = addOrder;
// Start the matching engine
const matchingEngine = new engine_1.MatchingEngine();
matchingEngine.start();
