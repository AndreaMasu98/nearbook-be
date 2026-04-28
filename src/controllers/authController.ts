import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../models/db';

// POST /api/auth/register
/* Gestisce la registrazione di un nuovo utente. */ 
export async function register(req: Request, res: Response): Promise<void> {
  const { nome, cognome, email, password } = req.body;

  if (!nome || !cognome || !email || !password) {
    res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM utenti WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email già registrata' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO utenti (nome, cognome, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, cognome, email`,
      [nome, cognome, email, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

// POST /api/auth/login
/* Gestisce il login di un utente esistente. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email e password obbligatorie' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
