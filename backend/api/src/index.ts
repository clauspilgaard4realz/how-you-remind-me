import './loadEnv.js';
import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';

const app = express();
const port = Number(process.env.PORT ?? 8081);

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'reminder-api',
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
  });
});

app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Reminder API listening on ${port}`);
});
