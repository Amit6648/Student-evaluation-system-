import express from 'express';
import { addEvaluation } from '../controllers/evaluationController.js';

const router = express.Router();

router.post('/evaluations', addEvaluation);

export default router;
