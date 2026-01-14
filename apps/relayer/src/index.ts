import express from "express";
import { Order } from "./models/order";
import { getMarkets } from "./api/markets";
import { health } from "./api/health";
import { book } from "./api/orderbook";
import { addOrder, getOrdersByMarket } from "./api/orders";

const app = express();
app.use(express.json());

// TODO: move to a separate file
const orders: Order[] = [];

app.get("/health", health);

app.get("/markets", getMarkets);

app.get("/orderbook", book);
app.get("/orders", getOrdersByMarket);
app.post("/orders", addOrder);

const port = 3001;
app.listen(port, () => {
  console.log(`Relayer listening on port ${port}`);
});
