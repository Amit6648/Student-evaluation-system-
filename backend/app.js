import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // Added
import hierarchyRoutes from './routes/hierarchyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import authRoutes from './routes/authRoutes.js'; // Added

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser()); // Added

import { protect } from './middleware/authMiddleware.js';

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api', protect, hierarchyRoutes);
app.use('/api', protect, userRoutes);
app.use('/api/virtual-classes', protect, classRoutes);
app.use('/api', protect, enrollmentRoutes);
app.use('/api', protect, evaluationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
