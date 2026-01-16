
import express from "express";
import cors from "cors";
import { Order } from "./models/order";
import { getMarkets } from "./api/markets";
import { health } from "./api/health";
import { getOrderBook } from "./api/orderbook";
import { addOrder, getOrdersByMarket } from "./api/orders";

const app = express();
app.use(express.json());
app.use(cors());

// TODO: move to a separate file
const orders: Order[] = [];

app.get("/health", health);

app.get("/markets", getMarkets);

app.get("/orderbook", getOrderBook);
app.get("/orders", getOrdersByMarket);
app.post("/orders", addOrder);

const port = 3001;
app.listen(port, () => {
  console.log(`Relayer listening on port ${port}`);
});
