import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { routes } from "../routes";

const app = express();
app.use(express.json());
app.use(cors());

app.use(routes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const port = 3001;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
