import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS configurato per accettare richieste solo dal frontend in sviluppo o produzione
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://nearbook-fe.onrender.com' : 'http://localhost:4200',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve le immagini caricate come file statici
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Swagger Documentation ─────────────────────────────────────────────
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Rotte
app.use('/api', routes);

// Endpoint di health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// error handler globale (per errori non gestiti nei controller)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Errore non gestito:', err.message);
  res.status(500).json({ error: err.message || 'Errore interno del server' });
});

app.listen(PORT, () => {
  console.log(`BE avviato su http://localhost:${PORT}`);
  console.log(`Swagger disponibile su http://localhost:${PORT}/swagger`);
});

export default app;
