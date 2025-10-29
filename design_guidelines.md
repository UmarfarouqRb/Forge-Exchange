# Design Guidelines: CEX-Style Decentralized Crypto Exchange

## Design Approach
**Reference-Based: Binance/CEX Exchange**
Using Binance as the primary design reference for this decentralized exchange application. The design emphasizes information density, professional trading interface aesthetics, and clear data hierarchy optimized for desktop trading experiences.

## Core Design Principles
1. **Desktop-First Trading Interface**: Optimize for large screens where serious trading happens
2. **Information Density**: Pack data efficiently without feeling cluttered
3. **Professional Trust**: Clean, precise layouts that convey reliability
4. **Instant Data Readability**: Clear typography hierarchy for quick scanning of prices and data

## Typography System

**Font Stack**: 
- Primary: 'Inter' or 'IBM Plex Sans' (clean, professional sans-serif via Google Fonts)
- Monospace: 'JetBrains Mono' or 'Roboto Mono' for prices and numerical data

**Type Scale**:
- Page Headers: text-2xl to text-3xl, font-semibold
- Section Headers: text-lg to text-xl, font-medium
- Trading Data (Prices): text-base to text-lg, font-mono, font-medium
- Body Text: text-sm, font-normal
- Small Data/Labels: text-xs, font-normal

## Layout & Spacing System

**Spacing Units**: Use Tailwind spacing of 2, 4, 6, and 8 as primary units
- Component padding: p-4 to p-6
- Section spacing: gap-4 to gap-6
- Page margins: px-4 to px-8

**Container Strategy**:
- Full-width app layout (no max-width constraints)
- Fixed sidebar navigation (w-64)
- Fluid main content area
- Dense grid layouts for data tables

## Navigation Structure

**Top Navigation Bar** (Fixed, h-16):
- Logo/Brand (left)
- Main navigation links (Home, Market, Spot, Futures, Asset) with icons from react-icons
- Wallet connection button (right)
- User account dropdown (right)

**Footer** (Minimal, h-12 to h-16):
- Secondary navigation links with icons
- Social links
- Copyright/legal links

## Page-Specific Layouts

### Home Page
**Hero Section**: Full-width market overview banner (h-64)
- Key market stats in horizontal cards
- Featured trading pairs
- 24h volume highlights

**Market Overview Grid**: 3-column layout (lg:grid-cols-3)
- Trending coins section
- Top gainers/losers
- Market sentiment indicators

**Price Chart Section**: Full-width chart component
- TradingView-style chart placeholder
- Timeframe selectors above chart

**Recent Trades**: 2-column layout showing recent activity

### Market Page
**Filters Bar**: Full-width sticky bar (h-16)
- Search input for trading pairs
- Category filters (Favorites, All, Spot, Futures)
- Sort options dropdown

**Market Table**: Full-width data table
- Columns: Pair, Price, 24h Change, 24h Volume, Chart
- Mini sparkline charts in each row
- Hover state for row selection
- Pagination at bottom

### Spot Trading Page
**Complex Grid Layout**:
- Left sidebar: Order book (w-72, h-screen)
- Center: Trading chart (flex-1, h-[60vh])
- Right sidebar: Trade execution panel (w-80)
- Bottom: Open orders/trade history tabs (h-[40vh])

**Order Book**: Dense table layout
- Price, Amount, Total columns
- Spread indicator in middle
- Scroll container with fixed headers

**Trading Panel**: 
- Tabbed interface (Buy/Sell)
- Input fields for amount/price
- Order type selector (Limit/Market)
- Action buttons (full-width)
- Available balance display

**Chart Section**:
- Full TradingView-style interface
- Timeframe buttons above
- Drawing tools toolbar
- Indicator controls

### Futures Trading Page
Similar to Spot with additions:
- Leverage slider component (prominent)
- Position management panel
- Margin calculator
- Liquidation price indicator

### Asset Page
**Balance Overview**: Grid layout (lg:grid-cols-4)
- Total balance card
- Available balance
- In orders
- PnL summary

**Asset Table**: Full-width sortable table
- Columns: Asset, Total, Available, In Order, USD Value, Actions
- Filter tabs (Spot, Futures, Earn)
- Search and hide small balances toggle

**Transaction History**: Full-width table
- Date, Type, Amount, Status, TxHash columns
- Expandable rows for details
- Export functionality

## Component Library

**Trading Cards**: Border, rounded corners (rounded-lg), internal padding (p-4 to p-6)

**Data Tables**: 
- Sticky headers
- Zebra striping on rows
- Compact spacing (py-2 for rows)
- Right-aligned numerical data
- Monospace font for prices

**Buttons**:
- Primary actions: px-6, py-2, rounded-md
- Secondary actions: outlined variant
- Icon buttons: p-2, rounded

**Input Fields**:
- Trading inputs: Outlined, h-10, px-4
- With suffix labels (e.g., "BTC", "USDT")
- Clear visual focus states

**Charts/Graphs**:
- Use Chart.js or Recharts libraries
- Consistent grid lines
- Clear axis labels
- Tooltips on hover

**Modal Overlays**:
- Centered, max-w-2xl
- Backdrop blur
- Close button top-right
- Padding p-6

## Responsive Behavior

**Desktop (lg and above)**: Full trading interface as designed

**Tablet (md)**: 
- Collapse sidebars to bottom sheets
- Stack trading panels vertically
- Maintain table layouts with horizontal scroll

**Mobile (base)**:
- Bottom tab navigation
- Simplified trading interface
- Swipeable charts
- Collapsible sections

## Data Display Patterns

**Price Changes**: Use directional indicators (↑↓ arrows from react-icons)

**Loading States**: Skeleton loaders matching table/card structures

**Empty States**: Centered message with icon, CTA to take action

**Status Indicators**: Small badges for order status, transaction state

## Icons
Use **react-icons** library exclusively:
- Navigation: FiHome, FiTrendingUp, FiActivity, FiPieChart, FiFolder
- Trading: FiArrowUp, FiArrowDown, FiRefreshCw, FiSettings
- Wallet: FiCreditCard, FiDownload, FiUpload

## Images
No hero images required. This is a data-dense trading application where functionality takes precedence over marketing visuals. Focus on charts, graphs, and data visualization instead.

## Accessibility
- Maintain consistent tab navigation through trading forms
- Ensure price change indicators have text equivalents
- Proper ARIA labels on all interactive elements
- Keyboard shortcuts for common trading actions (document in UI)
