import express from 'express';
import bodyParser from 'body-parser';
import { authorizeSession } from './api/session';
import { getOrders, addOrder } from './api/orders';
import { spot } from './api/spot';
import { getTokens } from './api/tokens';

const app = express();
const port = 3001;

app.use(bodyParser.json());

// API routes
app.post('/api/session/authorize', authorizeSession);
app.get('/api/orders/:address', getOrders);
app.post('/api/orders', addOrder);
app.post('/api/spot', spot);
app.get('/api/tokens/:chainId', getTokens);

app.listen(port, () => {
    console.log(`Relayer server listening at http://localhost:${port}`);
});
