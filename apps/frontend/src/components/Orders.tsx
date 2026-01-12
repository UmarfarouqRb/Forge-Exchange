import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { RELAYER_URL } from "../config";

interface Order {
  id: string;
  price: string;
  amount: string;
  side: "buy" | "sell";
  status: "open" | "filled" | "canceled";
}

export function Orders() {
  const { address } = useAccount();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!address) return;
    const fetchOrders = async () => {
      const response = await fetch(`${RELAYER_URL}/orders?market=WETH-USDC`);
      const data = await response.json();
      setOrders(data);
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 1000);
    return () => clearInterval(interval);
  }, [address]);

  return (
    <div>
      <h2>My Orders</h2>
      <table>
        <thead>
          <tr>
            <th>Side</th>
            <th>Price (USDC)</th>
            <th>Amount (WETH)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.side}</td>
              <td>{order.price}</td>
              <td>{order.amount}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
