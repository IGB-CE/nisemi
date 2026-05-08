import 'dotenv/config';
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

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'albania-rides-api' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/cities', citiesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/push-tokens', pushTokensRouter);

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
