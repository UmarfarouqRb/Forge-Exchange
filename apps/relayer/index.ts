import express from 'express';

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Relayer is running!');
});

app.post('/execute', (req, res) => {
  console.log('Received transaction request:', req.body);
  // In a real implementation, you would execute the transaction here
  res.status(200).json({ message: 'Transaction executed successfully' });
});

app.listen(port, () => {
  console.log(`Relayer listening on port ${port}`);
});
