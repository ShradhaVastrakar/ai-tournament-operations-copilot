import 'dotenv/config';
import { getConfig } from './config/env';
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import healthRouter from './routes/health';
import matchesRouter from './routes/matches';
import venuesRouter from './routes/venues';
import assistantRouter from './routes/assistant';

const config = getConfig(); // validates env and throws on missing required vars

const app = express();

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: config.bodyLimit }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/assistant', assistantRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port} [${config.nodeEnv}]`);
});

export default app;
