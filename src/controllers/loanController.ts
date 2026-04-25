import { Response } from 'express';
import pool from '../models/db';
import { AuthRequest } from '../middleware/auth';

// POST /api/loans  - Richiedi prestito (simulata)
export async function requestLoan(req: AuthRequest, res: Response): Promise<void> {
  const { libro_id, messaggio } = req.body;

  if (!libro_id) {
    res.status(400).json({ error: 'libro_id obbligatorio' });
    return;
  }

  try {
    // Verifica che il libro esista e non sia dell'utente stesso
    const libro = await pool.query('SELECT utente_id FROM libri WHERE id = $1', [libro_id]);
    if (libro.rows.length === 0) {
      res.status(404).json({ error: 'Libro non trovato' });
      return;
    }
    if (libro.rows[0].utente_id === req.userId) {
      res.status(400).json({ error: 'Non puoi richiedere il prestito di un tuo libro' });
      return;
    }

    // Verifica che non esista già una richiesta pendente
    const dup = await pool.query(
      `SELECT id FROM richieste_prestito WHERE libro_id = $1 AND richiedente_id = $2 AND stato = 'pendente'`,
      [libro_id, req.userId]
    );
    if (dup.rows.length > 0) {
      res.status(409).json({ error: 'Hai già una richiesta pendente per questo libro' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO richieste_prestito (libro_id, richiedente_id, messaggio)
       VALUES ($1, $2, $3) RETURNING *`,
      [libro_id, req.userId, messaggio || null]
    );

    res.status(201).json({ richiesta: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

// GET /api/loans/received  - Richieste ricevute (io sono il proprietario)
export async function getReceivedLoans(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT rp.*, l.titolo, l.autore, u.nome AS richiedente_nome, u.cognome AS richiedente_cognome
       FROM richieste_prestito rp
       JOIN libri l ON rp.libro_id = l.id
       JOIN utenti u ON rp.richiedente_id = u.id
       WHERE l.utente_id = $1
       ORDER BY rp.creato_il DESC`,
      [req.userId]
    );
    res.json({ richieste: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

// PATCH /api/loans/:id  - Accetta o rifiuta una richiesta
export async function updateLoanStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { stato } = req.body; // 'accettata' | 'rifiutata'

  if (!['accettata', 'rifiutata'].includes(stato)) {
    res.status(400).json({ error: "stato deve essere 'accettata' o 'rifiutata'" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE richieste_prestito rp SET stato = $1
       FROM libri l WHERE rp.libro_id = l.id AND rp.id = $2 AND l.utente_id = $3
       RETURNING rp.*`,
      [stato, id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Richiesta non trovata o non autorizzato' });
      return;
    }

    res.json({ richiesta: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
}
