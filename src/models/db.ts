import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/* Configurazione del pool di connessioni PostgreSQL. Utilizza DATABASE_URL da .env e SSL per connessione sicura. */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connesso al database PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Errore pool PostgreSQL:', err.message);
  process.exit(1);
});

export default pool;
