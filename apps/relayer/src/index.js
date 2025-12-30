"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const session_1 = require("./api/session");
const orders_1 = require("./api/orders");
const spot_1 = require("./api/spot");
const tokens_1 = require("./api/tokens");
const app = (0, express_1.default)();
const port = 3001;
app.use(body_parser_1.default.json());
// API routes
app.post('/api/session/authorize', session_1.authorizeSession);
app.get('/api/orders/:address', orders_1.getOrders);
app.post('/api/spot', spot_1.spot);
app.get('/api/tokens/:chainId', tokens_1.getTokens);
app.listen(port, () => {
    console.log(`Relayer server listening at http://localhost:${port}`);
});
