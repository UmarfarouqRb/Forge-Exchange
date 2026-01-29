import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();
app.use(express.json());
app.use(cors());

app.use(routes);

const port = 3001;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
