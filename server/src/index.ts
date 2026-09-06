import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDB } from './db/database.js';
import { seedDatabase } from './db/seedData.js';
import { venuesRouter } from './routes/venues.js';
import { routeRouter } from './routes/route.js';
import { poisRouter } from './routes/pois.js';
import { checkpointsRouter } from './routes/checkpoints.js';
import { imdfRouter } from './routes/imdf.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Mount API Routes
app.use('/api/venues', venuesRouter);
app.use('/api/venues', routeRouter);
app.use('/api/venues', poisRouter);
app.use('/api/venues', checkpointsRouter);
app.use('/api/venues', imdfRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('[Server] Connecting to PostgreSQL Database...');
    const db = await getDB();
    console.log('[Server] Initializing Seed Data...');
    await seedDatabase(db);

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` 🚀 Indoor Navigation API Server running on port ${PORT}`);
      console.log(` 📍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(` 🏢 Venues API:   http://localhost:${PORT}/api/venues`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
