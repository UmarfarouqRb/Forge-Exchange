
import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import { authorizeSession } from './api/session';
import { getOrders, addOrder } from './api/orders';
import { spot } from './api/spot';
import { getTokens } from './api/tokens';
import { getQuote } from './api/quote'; // Import the new quote function

const app: express.Application = express();
const port = 3001;

app.use(bodyParser.json());

// API routes
app.post('/api/session/authorize', authorizeSession);
app.get('/api/orders/:address', getOrders);
app.post('/api/orders', addOrder);
app.post('/api/spot', spot);
app.get('/api/tokens/:chainId', getTokens);

// Add the new quote endpoint
app.post('/api/v1/quote', getQuote);

const server = http.createServer(app);

// Start the server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Relayer server listening at http://localhost:${port}`);
  });
}

export { app, server };
