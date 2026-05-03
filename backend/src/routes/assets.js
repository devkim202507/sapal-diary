import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import {
  assetExists,
  createAsset,
  searchAssets,
  uploadAssets,
} from '../controllers/assetController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authMiddleware);

router.get('/exists', assetExists);
router.get('/search', searchAssets);
router.post('/upload', adminMiddleware, upload.single('file'), uploadAssets);
router.post('/', adminMiddleware, createAsset);

export default router;
