import express from 'express';
import { createVirtualClass, getVirtualClasses, getVirtualClassById, deleteVirtualClass } from '../controllers/classController.js';

const router = express.Router();

router.post('/', createVirtualClass);
router.get('/', getVirtualClasses);
router.get('/:id', getVirtualClassById);
router.delete('/:id', deleteVirtualClass);

export default router;
