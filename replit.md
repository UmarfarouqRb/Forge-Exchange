# DexExchange - Decentralized Crypto Exchange

## Overview
A professional Binance-style cryptocurrency exchange interface with wallet connection functionality. Users can trade crypto without KYC by connecting their Web3 wallet (MetaMask). The application features a dark theme with yellow/gold accents matching Binance's professional trading UI.

## Current Status
**Phase 1 Complete**: Schema and comprehensive frontend implementation for all MVP features
- All data models and TypeScript interfaces defined
- Complete UI implementation for all 5 pages
- Professional trading interface with Binance-inspired design
- Wallet connection integration ready

## Features

### Implemented (Frontend)
1. **Wallet Connection**
   - MetaMask integration using ethers.js
   - Wallet state management with React Context
   - Display wallet address and ETH balance
   - Connect/disconnect functionality

2. **Navigation**
   - Top navigation bar with logo and page links
   - Mobile-responsive bottom navigation
   - Active page highlighting
   - Wallet connection status in header

3. **Home Page**
   - Market statistics overview (24h volume, active traders, trading pairs)
   - Trending markets with price charts
   - Top gainers and losers sections
   - Interactive market cards with mini sparkline charts
   - Call-to-action buttons for trading and viewing markets

4. **Market Page**
   - Comprehensive trading pairs table
   - Real-time price display with 24h change indicators
   - Category filters (All, Spot, Futures)
   - Search functionality for trading pairs
   - Mini charts for each trading pair
   - Favorite/star functionality for pairs

5. **Spot Trading Page**
   - Professional 3-column layout (Order Book, Chart, Trade Panel)
   - Real-time order book with bids/asks
   - TradingView-style price chart with timeframe selectors
   - Buy/Sell trade panel with limit/market order types
   - Order history and open orders tabs
   - Trade history tracking

6. **Futures Trading Page**
   - Similar layout to Spot with futures-specific features
   - Leverage slider (1x-125x)
   - Perpetual contract indicators
   - Mark price and funding rate display
   - Position management interface
   - Liquidation price tracking
   - Open Interest and volume statistics

7. **Assets Page**
   - Wallet balance overview (Total, Available, In Orders, 24h PnL)
   - Detailed asset table with search and filters
   - Hide small balances toggle
   - Deposit/Withdraw actions
   - Transaction history with status badges
   - TxHash display for on-chain transactions

### Pending Implementation
- Backend API endpoints for all features
- Data persistence with in-memory storage
- Real market data integration
- Actual wallet transaction signing
- Order placement and execution logic

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling
- Recharts for data visualization
- ethers.js for Web3 wallet integration
- React Icons (Feather Icons)

### Backend
- Express.js
- In-memory storage (MemStorage)
- Drizzle ORM for schema management

### Design System
- Dark theme with yellow/gold primary color (Binance-inspired)
- Professional trading interface aesthetics
- Desktop-first responsive design
- Monospace fonts for prices and numerical data
- Information-dense layouts optimized for trading

## Project Structure

```
client/
  src/
    components/
      Navigation.tsx - Top navigation with wallet connection
      PriceChange.tsx - Price change indicator component
      MiniChart.tsx - Small sparkline charts
      OrderBook.tsx - Trading order book display
      TradingChart.tsx - Main trading chart component
      TradePanel.tsx - Buy/Sell order placement panel
      ui/ - Shadcn UI components
    contexts/
      WalletContext.tsx - Wallet state management
    lib/
      wallet.ts - Web3 wallet utilities
      queryClient.ts - TanStack Query configuration
    pages/
      Home.tsx - Landing page with market overview
      Market.tsx - Trading pairs listing
      Spot.tsx - Spot trading interface
      Futures.tsx - Futures trading interface
      Assets.tsx - Wallet assets and transaction history
    App.tsx - Main app component with routing
    
server/
  routes.ts - API route definitions (to be implemented)
  storage.ts - In-memory data storage interface
  
shared/
  schema.ts - Drizzle schemas and TypeScript types
```

## Data Models

### Trading Pairs
- Symbol, base/quote assets
- Current price, 24h change, volume
- High/low prices
- Favorite status, category (spot/futures)

### Market Data
- Historical price data for charts (OHLCV)
- Timestamps for time-series data

### Orders
- Wallet address, symbol, order type
- Buy/sell side, price, amount
- Status (pending, filled, cancelled)
- Category (spot/futures), leverage

### Assets
- Wallet address, asset symbol
- Total, available, in-order balances
- USD value calculation

### Transactions
- Type (deposit, withdrawal, trade)
- Asset, amount, status
- TxHash for on-chain verification
- Timestamps

## Development Workflow

### Running the Application
```bash
npm run dev
```
This starts both the Express backend (API) and Vite frontend dev server on the same port.

### Next Steps
1. Implement backend API endpoints in `server/routes.ts`
2. Add storage methods to `server/storage.ts`
3. Connect frontend to backend APIs
4. Add real-time price updates simulation
5. Test wallet connection and order placement flows
6. Add loading states and error handling

## Design Guidelines
See `design_guidelines.md` for comprehensive design specifications including:
- Typography system
- Color palette and theming
- Component usage patterns
- Layout specifications for each page
- Responsive behavior
- Accessibility standards

## Environment Variables
- `SESSION_SECRET` - Express session secret (already configured)
- MetaMask wallet connection via browser extension (no API key required)

## Notes
- This is a front-end focused MVP with simulated trading functionality
- Real blockchain integration would require connecting to DEX protocols (Uniswap, PancakeSwap, etc.)
- Price data is currently mocked and will need real API integration (CoinGecko, CoinMarketCap)
- All trading operations are simulated until backend is fully implemented
