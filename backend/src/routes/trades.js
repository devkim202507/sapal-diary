import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createTrade, deleteTrade, listTrades } from '../controllers/tradeController.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createTrade);
router.get('/', listTrades);
router.delete('/:id', deleteTrade);

export default router;
