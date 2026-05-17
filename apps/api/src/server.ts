import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import driversRouter from './routes/drivers.js';
import tripsRouter from './routes/trips.js';
import reservationsRouter from './routes/reservations.js';
import reviewsRouter from './routes/reviews.js';
import citiesRouter from './routes/cities.js';
import adminRouter from './routes/admin.js';
import pushTokensRouter from './routes/push-tokens.js';
import reportsRouter from './routes/reports.js';
import messagesRouter from './routes/messages.js';
import policiesRouter from './routes/policies.js';
import placesRouter from './routes/places.js';
import rideAlertsRouter from './routes/ride-alerts.js';
import blocksRouter from './routes/blocks.js';
import { attachRealtime } from './realtime/index.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN ?? '*').split(',').map((o) => o.trim());
app.use(
  cors({
    origin:
      allowedOrigins.length === 1 && allowedOrigins[0] === '*'
        ? '*'
        : (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) cb(null, true);
            else cb(new Error('Not allowed by CORS'));
          },
  }),
);
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'albania-rides-api' }));

app.use('/', policiesRouter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/cities', citiesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/push-tokens', pushTokensRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/places', placesRouter);
app.use('/api/v1/ride-alerts', rideAlertsRouter);
app.use('/api/v1/blocks', blocksRouter);

const httpServer = createServer(app);
attachRealtime(httpServer);

httpServer.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
