import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import matchRoutes from './routes/matches';
import messageRoutes from './routes/messages';
import verificationRoutes from './routes/verification';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/matches', authMiddleware, matchRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 TrustMatch server running on port ${PORT}`);
});

export default app;
