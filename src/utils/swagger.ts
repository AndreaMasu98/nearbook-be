import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

/* Configurazione di swagger-jsdoc per generare la documentazione API. Definisce info, schemi e sicurezza. */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NearBook API',
      version: '1.0.0',
      description: 'API per condividere libri vicino a te',
      contact: {
        name: 'NearBook Support',
        email: 'support@nearbook.com',
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            cognome: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            titolo: { type: 'string' },
            autore: { type: 'string' },
            anno: { type: 'number' },
            categoria: { type: 'string' },
            descrizione: { type: 'string' },
            cover_path: { type: 'string' },
            thumb_path: { type: 'string' },
            disponibile: { type: 'boolean' },
            visualizzazioni: { type: 'number' },
            utente_nome: { type: 'string' },
            utente_cognome: { type: 'string' },
            distanza_metri: { type: 'number' },
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, '../routes/index.js'), path.join(__dirname, '../routes/index.ts')],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
