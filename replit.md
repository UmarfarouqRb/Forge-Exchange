# Forge - Decentralized Crypto Exchange

## Overview
A professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Web3 wallet (MetaMask). The platform features a modern dark theme with gradient accents, TradingView integration for live market data, and full mobile responsiveness.

## Current Status
**Production Ready**: Professional CEX-like landing page with multi-chain support and Netlify deployment configured
- Professional landing page with gradient hero, features, and market overview
- Multi-chain support (BASE default, BNB, ARB; SUI coming soon)
- TradingView live market data integration
- Full mobile responsiveness across all pages
- Netlify deployment configuration with proper SPA routing
- Comprehensive SEO optimization
- All data models and TypeScript interfaces defined
- Complete UI implementation for all 5 pages
- Professional trading interface with CEX-inspired design
- Wallet connection integration ready

## Features

### Implemented (Frontend)
1. **Multi-Chain Support** (NEW)
   - ChainContext for global chain state management
   - Chain selector dropdown before wallet button
   - Support for BASE (default), BNB Chain, and Arbitrum
   - SUI network listed as "Coming Soon" (non-EVM compatibility note)
   - Automatic chain switching via MetaMask
   - Graceful error handling for unsupported chains
   - Persistent chain selection via localStorage

2. **Wallet Connection**
   - MetaMask integration using ethers.js
   - Wallet state management with React Context
   - Display wallet address and balance in native currency
   - Connect/disconnect functionality
   - Chain-aware balance updates

3. **Navigation**
   - Top navigation bar with Forge logo and page links
   - Chain selector integrated before wallet button
   - Mobile-responsive bottom navigation
   - Active page highlighting
   - Wallet connection status in header

4. **Home Page** (REDESIGNED)
   - Professional CEX-like landing page with gradient hero section
   - "Decentralized Trading, Simplified" tagline with gradient text
   - Key value propositions: No KYC, Low Fees, Lightning Fast Execution
   - Feature highlights section (Secure Trading, Lightning Fast, Multi-Chain, Advanced Tools)
   - TradingView Market Overview Widget with live crypto prices
   - Market statistics cards (24h volume, active traders, trading pairs)
   - Top gainers and losers sections with real-time data
   - Multiple call-to-action sections
   - Interactive market cards with mini sparkline charts
   - Fully responsive mobile layout

5. **Market Page**
   - Comprehensive trading pairs table
   - Real-time price display with 24h change indicators
   - Category filters (All, Spot, Futures)
   - Search functionality for trading pairs
   - Mini charts for each trading pair
   - Favorite/star functionality for pairs

6. **Spot Trading Page**
   - Professional 3-column layout (Order Book, Chart, Trade Panel)
   - Real-time order book with bids/asks
   - TradingView-style price chart with timeframe selectors
   - Buy/Sell trade panel with limit/market order types
   - Order history and open orders tabs
   - Trade history tracking

7. **Futures Trading Page**
   - Similar layout to Spot with futures-specific features
   - Leverage slider (1x-125x)
   - Perpetual contract indicators
   - Mark price and funding rate display
   - Position management interface
   - Liquidation price tracking
   - Open Interest and volume statistics

8. **Assets Page** (ENHANCED)
   - Wallet balance overview (Total, Available, In Orders, 24h PnL)
   - Detailed asset table with search and filters
   - Mobile-responsive layout (cards on mobile, table on desktop)
   - Hide small balances toggle
   - Deposit/Withdraw actions
   - Transaction history with status badges
   - TxHash display for on-chain transactions
   - Fully responsive mobile design

9. **SEO & Marketing** (NEW)
   - Comprehensive meta tags for search engines
   - Open Graph tags for social media sharing
   - Twitter Card integration
   - Descriptive page titles and meta descriptions
   - Optimized for discoverability

10. **Deployment** (NEW)
    - Netlify configuration (netlify.toml)
    - SPA routing support (_redirects file)
    - Optimized build settings
    - Ready for production deployment

### Pending Implementation
- Backend API endpoints for all features
- Data persistence with in-memory storage
- Real DEX protocol integration (Uniswap, PancakeSwap, etc.)
- Actual wallet transaction signing
- Order placement and execution logic
- SUI network full support (requires non-EVM wallet integration)

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling
- Recharts for data visualization
- ethers.js for Web3 wallet integration
- TradingView widgets for live market data
- Lucide React icons

### Backend
- Express.js
- In-memory storage (MemStorage)
- Drizzle ORM for schema management

### Design System
- Modern dark theme with gradient accents
- Professional CEX-inspired landing page
- Mobile-first responsive design throughout
- Monospace fonts for prices and numerical data
- Information-dense trading layouts
- Gradient hero text and call-to-action buttons
- Clean, professional color palette

## Project Structure

```
client/
  public/
    _redirects - Netlify SPA routing configuration
  src/
    components/
      Navigation.tsx - Top navigation with chain selector and wallet
      ChainSelector.tsx - Multi-chain dropdown selector (NEW)
      PriceChange.tsx - Price change indicator component
      MiniChart.tsx - Small sparkline charts
      OrderBook.tsx - Trading order book display
      TradingChart.tsx - Main trading chart component
      TradePanel.tsx - Buy/Sell order placement panel
      ui/ - Shadcn UI components
    contexts/
      WalletContext.tsx - Wallet state management
      ChainContext.tsx - Multi-chain state management (NEW)
    lib/
      wallet.ts - Web3 wallet utilities
      queryClient.ts - TanStack Query configuration
    pages/
      Home.tsx - CEX-style landing page with TradingView (REDESIGNED)
      Market.tsx - Trading pairs listing
      Spot.tsx - Spot trading interface
      Futures.tsx - Futures trading interface
      Assets.tsx - Wallet assets and transaction history (ENHANCED)
    App.tsx - Main app component with routing
  index.html - SEO optimized HTML with meta tags (ENHANCED)
    
server/
  routes.ts - API route definitions (to be implemented)
  storage.ts - In-memory data storage interface
  
shared/
  schema.ts - Drizzle schemas and TypeScript types

netlify.toml - Netlify deployment configuration (NEW)
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

### Building for Production
```bash
npm run build
```
Output is generated in the `dist` directory, ready for Netlify deployment.

### Deploying to Netlify
1. Connect your repository to Netlify
2. Netlify will automatically detect the configuration from `netlify.toml`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. The `_redirects` file ensures proper SPA routing

### Next Steps
1. Implement backend API endpoints in `server/routes.ts`
2. Add storage methods to `server/storage.ts`
3. Connect frontend to backend APIs
4. Integrate real DEX protocols (Uniswap, PancakeSwap, etc.)
5. Add SUI network support with non-EVM wallet integration
6. Test wallet connection and order placement flows end-to-end
7. Add comprehensive error handling and loading states

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
- TradingView widgets use public CDN (no API key required)

## Supported Networks
- **BASE** (Default) - Coinbase's Layer 2 network
- **BNB Chain** - Binance Smart Chain
- **Arbitrum** - Ethereum Layer 2
- **SUI** (Coming Soon) - Non-EVM network requiring specialized wallet integration

## Notes
- Professional CEX-like landing page with compelling marketing copy
- TradingView integration provides live market data from major exchanges
- Multi-chain support via MetaMask for seamless chain switching
- SUI network appears in selector but shows "Coming Soon" message (non-EVM)
- This is a front-end focused MVP with simulated trading functionality
- Real blockchain integration would require connecting to DEX protocols (Uniswap, PancakeSwap, etc.)
- All trading operations are simulated until backend is fully implemented
- Ready for Netlify deployment with proper SPA routing configuration
