
import express from "express";
import cors from "cors";
import { getMarkets } from "./markets";
import { getOrderBook } from "./orderbook";
import { addOrder, getOrders } from "./orders";
import { health } from "./health";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/health", health);

app.get("/api/markets", getMarkets);

app.get("/api/order-book/:pair", getOrderBook);
app.get("/api/orders/:address", getOrders);
app.post("/api/orders", addOrder);

const port = 3001;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
