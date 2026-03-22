import express from 'express';
import { getUsers, getEligibleStudents } from '../controllers/userController.js';

const router = express.Router();

router.get('/users', getUsers);
router.get('/eligible-students/:class_id', getEligibleStudents);

export default router;
