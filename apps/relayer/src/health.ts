import express, { Router } from 'express';

const router: Router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Relayer is warm and ready!');
});

export default router;
