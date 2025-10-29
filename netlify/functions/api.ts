import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { storage } from "../../server/storage";
import { insertOrderSchema } from "../../shared/schema";

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { path, httpMethod, body, queryStringParameters } = event;
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };

  if (httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const apiPath = path.replace("/.netlify/functions/api", "");
    
    // Trading Pairs Routes
    if (apiPath === "/trading-pairs" && httpMethod === "GET") {
      const category = queryStringParameters?.category;
      const pairs = await storage.getAllTradingPairs(category);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pairs),
      };
    }

    if (apiPath === "/trading-pairs/trending" && httpMethod === "GET") {
      const pairs = await storage.getTrendingPairs(6);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pairs),
      };
    }

    if (apiPath === "/trading-pairs/top-gainers" && httpMethod === "GET") {
      const pairs = await storage.getTopGainers(10);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pairs),
      };
    }

    if (apiPath === "/trading-pairs/top-losers" && httpMethod === "GET") {
      const pairs = await storage.getTopLosers(10);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pairs),
      };
    }

    if (apiPath.startsWith("/trading-pairs/") && httpMethod === "GET") {
      const symbol = apiPath.split("/")[2];
      const pair = await storage.getTradingPairBySymbol(symbol);
      if (!pair) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Trading pair not found" }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pair),
      };
    }

    // Market Data Routes
    if (apiPath.startsWith("/market-data/") && httpMethod === "GET") {
      const symbol = apiPath.split("/")[2];
      const limit = queryStringParameters?.limit;
      const data = await storage.getMarketData(
        symbol,
        limit ? parseInt(limit) : undefined
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    // Order Book Route
    if (apiPath.startsWith("/order-book/") && httpMethod === "GET") {
      const symbol = apiPath.split("/")[2];
      const pair = await storage.getTradingPairBySymbol(symbol);
      
      if (!pair) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Trading pair not found" }),
        };
      }

      const basePrice = parseFloat(pair.currentPrice);
      
      const bids = Array.from({ length: 20 }, (_, i) => ({
        price: (basePrice - i * (basePrice * 0.0002)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((basePrice - i * (basePrice * 0.0002)) * Math.random() * 2).toFixed(2),
      }));
      
      const asks = Array.from({ length: 20 }, (_, i) => ({
        price: (basePrice + i * (basePrice * 0.0002)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((basePrice + i * (basePrice * 0.0002)) * Math.random() * 2).toFixed(2),
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bids, asks, symbol, timestamp: new Date() }),
      };
    }

    // Orders Routes
    if (apiPath.startsWith("/orders/") && !apiPath.includes("/status") && httpMethod === "GET") {
      const walletAddress = apiPath.split("/")[2];
      const category = queryStringParameters?.category;
      const orders = await storage.getOrdersByWallet(walletAddress, category);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders),
      };
    }

    if (apiPath === "/orders" && httpMethod === "POST") {
      const parsedBody = JSON.parse(body || "{}");
      const validatedData = insertOrderSchema.parse(parsedBody);
      const order = await storage.createOrder(validatedData);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(order),
      };
    }

    if (apiPath.match(/\/orders\/(.+)\/status/) && httpMethod === "PATCH") {
      const id = apiPath.split("/")[2];
      const parsedBody = JSON.parse(body || "{}");
      const { status } = parsedBody;
      
      if (!status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Status is required" }),
        };
      }

      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Order not found" }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(order),
      };
    }

    // Assets Routes
    if (apiPath.startsWith("/assets/") && httpMethod === "GET") {
      const walletAddress = apiPath.split("/")[2];
      const assets = await storage.getAssetsByWallet(walletAddress);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(assets),
      };
    }

    // Transactions Routes
    if (apiPath.startsWith("/transactions/") && !apiPath.includes("/deposit") && !apiPath.includes("/withdraw") && httpMethod === "GET") {
      const walletAddress = apiPath.split("/")[2];
      const limit = queryStringParameters?.limit;
      const transactions = await storage.getTransactionsByWallet(
        walletAddress,
        limit ? parseInt(limit) : undefined
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transactions),
      };
    }

    if (apiPath === "/transactions" && httpMethod === "POST") {
      const parsedBody = JSON.parse(body || "{}");
      const transaction = await storage.createTransaction(parsedBody);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(transaction),
      };
    }

    // Deposit Route
    if (apiPath === "/transactions/deposit" && httpMethod === "POST") {
      const parsedBody = JSON.parse(body || "{}");
      const { walletAddress, asset, amount } = parsedBody;
      const MINIMUM_DEPOSIT = 10;

      if (!walletAddress || !asset || !amount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid deposit amount" }),
        };
      }

      if (depositAmount < MINIMUM_DEPOSIT) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Minimum deposit is $${MINIMUM_DEPOSIT}` }),
        };
      }

      const transaction = await storage.createTransaction({
        walletAddress,
        type: "deposit",
        asset,
        amount: depositAmount.toString(),
        status: "completed",
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      });

      const existingAsset = await storage.getAssetByWalletAndSymbol(walletAddress, asset);
      if (existingAsset) {
        const newTotal = parseFloat(existingAsset.total) + depositAmount;
        const newAvailable = parseFloat(existingAsset.available) + depositAmount;
        await storage.createOrUpdateAsset({
          walletAddress,
          asset,
          total: newTotal.toString(),
          available: newAvailable.toString(),
          inOrder: existingAsset.inOrder,
          usdValue: newTotal.toString(),
        });
      } else {
        await storage.createOrUpdateAsset({
          walletAddress,
          asset,
          total: depositAmount.toString(),
          available: depositAmount.toString(),
          inOrder: "0",
          usdValue: depositAmount.toString(),
        });
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(transaction),
      };
    }

    // Withdrawal Route
    if (apiPath === "/transactions/withdraw" && httpMethod === "POST") {
      const parsedBody = JSON.parse(body || "{}");
      const { walletAddress, asset, amount } = parsedBody;
      const MINIMUM_WITHDRAWAL = 10;
      const WITHDRAWAL_FEE = 0.1;

      if (!walletAddress || !asset || !amount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid withdrawal amount" }),
        };
      }

      if (withdrawAmount < MINIMUM_WITHDRAWAL) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Minimum withdrawal is $${MINIMUM_WITHDRAWAL}` }),
        };
      }

      const existingAsset = await storage.getAssetByWalletAndSymbol(walletAddress, asset);
      if (!existingAsset) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Asset not found" }),
        };
      }

      const totalCost = withdrawAmount + WITHDRAWAL_FEE;
      const available = parseFloat(existingAsset.available);
      
      if (available < totalCost) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Insufficient balance. Need $${totalCost.toFixed(2)} (including $${WITHDRAWAL_FEE} fee)` 
          }),
        };
      }

      const transaction = await storage.createTransaction({
        walletAddress,
        type: "withdrawal",
        asset,
        amount: withdrawAmount.toString(),
        status: "completed",
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      });

      const newTotal = parseFloat(existingAsset.total) - totalCost;
      const newAvailable = parseFloat(existingAsset.available) - totalCost;
      
      await storage.createOrUpdateAsset({
        walletAddress,
        asset,
        total: Math.max(0, newTotal).toString(),
        available: Math.max(0, newAvailable).toString(),
        inOrder: existingAsset.inOrder,
        usdValue: Math.max(0, newTotal).toString(),
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(transaction),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };

  } catch (error: any) {
    console.error("API Error:", error);
    
    if (error.name === "ZodError") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid data", details: error.errors }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
};
