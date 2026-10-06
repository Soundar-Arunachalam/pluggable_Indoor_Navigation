import express from 'express';
import cors from 'cors';
import compression from 'compression';
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

// Enable gzip compression for API payloads
app.use(compression());

// Strict CORS (allow localhost for dev/testing, adapt in prod)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
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
