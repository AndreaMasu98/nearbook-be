import { Router } from 'express';
import { register, login } from '../controllers/authController';
import {
  getNearbyBooks, getBookById, createBook, deleteBook, getMyStats
} from '../controllers/bookController';
import { requestLoan, getReceivedLoans, updateLoanStatus } from '../controllers/loanController';
import { authMiddleware } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               cognome:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 */
router.post('/auth/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 */
router.post('/auth/login', login);

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Ottieni libri vicini con filtri
 *     tags: [Books]
 *     parameters:
 *       - name: lat
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *       - name: lng
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *       - name: raggio
 *         in: query
 *         schema:
 *           type: number
 *           default: 2000
 *       - name: categoria
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista dei libri trovati
 */
router.get('/books', getNearbyBooks);

/**
 * @swagger
 * /api/books/stats/me:
 *   get:
 *     summary: Ottieni le tue statistiche personali
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche personali
 */
router.get('/books/stats/me', authMiddleware, getMyStats);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Ottieni dettagli di un libro
 *     tags: [Books]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dettagli del libro
 *       404:
 *         description: Libro non trovato
 */
router.get('/books/:id', getBookById);

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Crea un nuovo libro
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titolo:
 *                 type: string
 *               autore:
 *                 type: string
 *               anno:
 *                 type: integer
 *               categoria:
 *                 type: string
 *               descrizione:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Libro creato con successo
 */
router.post('/books', authMiddleware, upload.single('cover'), processImage, createBook);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Elimina un libro
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Libro eliminato con successo
 */
router.delete('/books/:id', authMiddleware, deleteBook);

/**
 * @swagger
 * /api/loans:
 *   post:
 *     summary: Richiedi il prestito di un libro
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               libro_id:
 *                 type: integer
 *               messaggio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Richiesta di prestito creata
 */
router.post('/loans', authMiddleware, requestLoan);

/**
 * @swagger
 * /api/loans/received:
 *   get:
 *     summary: Ottieni le richieste di prestito ricevute
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista delle richieste ricevute
 */
router.get('/loans/received', authMiddleware, getReceivedLoans);

/**
 * @swagger
 * /api/loans/{id}:
 *   patch:
 *     summary: Aggiorna lo stato di una richiesta di prestito
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stato:
 *                 type: string
 *                 enum: [accettato, rifiutato]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 */
router.patch('/loans/:id', authMiddleware, updateLoanStatus);

export default router;
