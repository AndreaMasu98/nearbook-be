import { Request, Response } from 'express';
import pool from '../models/db';
import { AuthRequest } from '../middleware/auth';

// GET /api/books?lat=&lng=&raggio=2000&categoria=
// Restituisce i libri entro il raggio specificato (default 2km), ordinati per distanza
export async function getNearbyBooks(req: Request, res: Response): Promise<void> {
  const { lat, lng, raggio = 2000, categoria } = req.query;

  if (!lat || !lng) {
    res.status(400).json({ error: 'Parametri lat e lng obbligatori' });
    return;
  }

  try {
    let query = `
      SELECT
        l.id,
        l.titolo,
        l.autore,
        l.anno,
        l.categoria,
        l.descrizione,
        l.cover_path,
        l.thumb_path,
        l.disponibile,
        l.visualizzazioni,
        u.nome AS utente_nome,
        u.cognome AS utente_cognome,
        ST_X(l.posizione) AS longitudine,
        ST_Y(l.posizione) AS latitudine,
        ST_Distance(
          l.posizione::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distanza_metri
      FROM libri l
      JOIN utenti u ON l.utente_id = u.id
      WHERE
        ST_DWithin(
          l.posizione::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
        AND l.disponibile = TRUE
    `;

    const params: (string | number)[] = [Number(lat), Number(lng), Number(raggio)];

    if (categoria && categoria !== 'tutti') {
      params.push(categoria as string);
      query += ` AND l.categoria = $${params.length}`;
    }

    query += ' ORDER BY distanza_metri ASC';

    const result = await pool.query(query, params);

    // Aggiorna visualizzazioni in background
    if (result.rows.length > 0) {
      const ids = result.rows.map((r: any) => r.id);
      pool.query('UPDATE libri SET visualizzazioni = visualizzazioni + 1 WHERE id = ANY($1)', [ids]);
    }

    res.json({ books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero dei libri' });
  }
}

// GET /api/books/:id
export async function getBookById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT l.*, u.nome AS utente_nome, u.cognome AS utente_cognome,
              ST_Y(l.posizione::geometry) AS lat, ST_X(l.posizione::geometry) AS lng
       FROM libri l JOIN utenti u ON l.utente_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Libro non trovato' });
      return;
    }

    // Incrementa visualizzazioni
    pool.query('UPDATE libri SET visualizzazioni = visualizzazioni + 1 WHERE id = $1', [id]);

    res.json({ book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

// POST /api/books  (richiede auth)
export async function createBook(req: AuthRequest, res: Response): Promise<void> {
  const { titolo, autore, anno, categoria, descrizione, lat, lng } = req.body;
  const coverPath = (req as any).coverPath || null;
  const thumbPath = (req as any).thumbPath || null;

  if (!titolo || !autore || !lat || !lng) {
    res.status(400).json({ error: 'Titolo, autore, lat e lng sono obbligatori' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO libri
         (titolo, autore, anno, categoria, descrizione, cover_path, thumb_path, utente_id, posizione)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($10, $9), 4326))
       RETURNING *`,
      [titolo, autore, anno, categoria, descrizione, coverPath, thumbPath, req.userId, Number(lat), Number(lng)]
    );

    res.status(201).json({ book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella creazione del libro' });
  }
}

// PATCH /api/books/:id  (modifica libro - solo il proprietario)
export async function updateBook(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { titolo, autore, anno, categoria, descrizione, disponibile } = req.body;
  const coverPath = (req as any).coverPath || null;
  const thumbPath = (req as any).thumbPath || null;

  try {
    // Verifica che il libro esista e appartenga all'utente
    const bookCheck = await pool.query(
      'SELECT id FROM libri WHERE id = $1 AND utente_id = $2',
      [id, req.userId]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: 'Libro non trovato o non autorizzato' });
      return;
    }

    // Costruisci la query UPDATE dinamicamente
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (titolo !== undefined) {
      updates.push(`titolo = $${paramIndex}`);
      params.push(titolo);
      paramIndex++;
    }

    if (autore !== undefined) {
      updates.push(`autore = $${paramIndex}`);
      params.push(autore);
      paramIndex++;
    }

    if (anno !== undefined) {
      updates.push(`anno = $${paramIndex}`);
      params.push(anno);
      paramIndex++;
    }

    if (categoria !== undefined) {
      updates.push(`categoria = $${paramIndex}`);
      params.push(categoria);
      paramIndex++;
    }

    if (descrizione !== undefined) {
      updates.push(`descrizione = $${paramIndex}`);
      params.push(descrizione);
      paramIndex++;
    }

    if (disponibile !== undefined) {
      updates.push(`disponibile = $${paramIndex}`);
      params.push(disponibile);
      paramIndex++;
    }

    if (coverPath !== null) {
      updates.push(`cover_path = $${paramIndex}`);
      params.push(coverPath);
      paramIndex++;
    }

    if (thumbPath !== null) {
      updates.push(`thumb_path = $${paramIndex}`);
      params.push(thumbPath);
      paramIndex++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Nessun campo da aggiornare' });
      return;
    }

    params.push(id);
    params.push(req.userId);

    const query = `
      UPDATE libri
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND utente_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({ book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del libro' });
  }
}

// DELETE /api/books/:id  (solo il proprietario)
export async function deleteBook(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM libri WHERE id = $1 AND utente_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Libro non trovato o non autorizzato' });
      return;
    }
    res.json({ message: 'Libro eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  }
}

// GET /api/books/my-books  (ottieni i libri caricati dall'utente loggato)
export async function getMyBooks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT
         l.id,
         l.titolo,
         l.autore,
         l.anno,
         l.categoria,
         l.descrizione,
         l.cover_path,
         l.thumb_path,
         l.disponibile,
         l.visualizzazioni,
         ST_X(l.posizione) AS lng,
         ST_Y(l.posizione) AS lat,
         l.creato_il,
         u.nome AS utente_nome,
         u.cognome AS utente_cognome
       FROM libri l
       JOIN utenti u ON l.utente_id = u.id
       WHERE l.utente_id = $1
       ORDER BY l.creato_il DESC`,
      [req.userId]
    );

    res.json({ books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero dei tuoi libri' });
  }
}

// GET /api/books/stats/me  (statistiche dell'utente loggato)
export async function getMyStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const totali = await pool.query(
      'SELECT COUNT(*) AS totale_libri, SUM(visualizzazioni) AS totale_view FROM libri WHERE utente_id = $1',
      [req.userId]
    );
    const richieste = await pool.query(
      `SELECT COUNT(*) AS totale_richieste FROM richieste_prestito rp
       JOIN libri l ON rp.libro_id = l.id WHERE l.utente_id = $1`,
      [req.userId]
    );
    const categorie = await pool.query(
      'SELECT categoria, COUNT(*) AS count FROM libri WHERE utente_id = $1 GROUP BY categoria ORDER BY count DESC',
      [req.userId]
    );

    res.json({
      totale_libri: Number(totali.rows[0].totale_libri),
      totale_visualizzazioni: Number(totali.rows[0].totale_view || 0),
      totale_richieste: Number(richieste.rows[0].totale_richieste),
      per_categoria: categorie.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel calcolo delle statistiche' });
  }
}
