import express from 'express';
import { getHierarchy, getSections } from '../controllers/hierarchyController.js';

const router = express.Router();

router.get('/hierarchy', getHierarchy);
router.get('/sections', getSections);

export default router;
