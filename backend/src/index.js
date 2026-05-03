import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { getAnalysis, getPositions } from './controllers/tradeController.js';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import tradeRoutes from './routes/trades.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/assets', assetRoutes);
app.use('/trades', tradeRoutes);
app.get('/positions', authMiddleware, getPositions);
app.get('/analysis', authMiddleware, getAnalysis);

app.use(errorHandler);

await connectDatabase();
app.listen(port, () => {
  console.log(`sapal-diary API listening on :${port}`);
});
