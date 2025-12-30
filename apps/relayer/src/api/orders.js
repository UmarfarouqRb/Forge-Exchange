"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrders = void 0;
const db_1 = require("../db/db");
async function getOrders(req, res) {
    const { address } = req.params;
    const orders = await (0, db_1.getOrders)(address);
    res.json(orders);
}
exports.getOrders = getOrders;
