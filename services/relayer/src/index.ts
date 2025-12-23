import express from 'express';
import bodyParser from 'body-parser';
import { health } from './api/health';
import { spot } from './api/spot';
import { getOrderBook, addOrder } from './api/orderbook';
import { authorizeSession } from './api/session';

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Ok');
});

app.get('/health', health);
app.post('/spot', spot);

app.get('/orderbook', getOrderBook);
app.post('/orderbook', addOrder);

app.post('/session/authorize', authorizeSession);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Relayer listening on port ${port}`);
});
