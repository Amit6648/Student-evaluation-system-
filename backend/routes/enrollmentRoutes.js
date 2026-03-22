import express from 'express';
import { enrollStudent, removeStudent, batchEnroll } from '../controllers/enrollmentController.js';

const router = express.Router();

router.post('/enrollments', enrollStudent);
router.delete('/enrollments/:id', removeStudent);
router.post('/enroll-multiple', batchEnroll);

export default router;
