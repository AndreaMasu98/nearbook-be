/* Schema SQL per NearBook: definisce tabelle utenti, libri e richieste di prestito. Utilizza PostGIS per geolocalizzazione. Include dati di test. */

CREATE EXTENSION IF NOT EXISTS postgis;

/* TABELLA: utenti */

CREATE TABLE IF NOT EXISTS utenti (
  id             SERIAL PRIMARY KEY,
  nome           VARCHAR(100) NOT NULL,
  cognome        VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT         NOT NULL,
  bio            TEXT,
  avatar_path    TEXT,
  creato_il      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  aggiornato_il  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

/* TABELLA: libri */
/* La colonna `posizione` usa il tipo geometry(Point, 4326) */
/* dove 4326 = WGS84 (lo stesso sistema del GPS) */
/* ST_MakePoint(lng, lat). attenzione: X=lng, Y=lat */

CREATE TABLE IF NOT EXISTS libri (
  id             SERIAL PRIMARY KEY,
  titolo         VARCHAR(255) NOT NULL,
  autore         VARCHAR(255) NOT NULL,
  anno           INTEGER,
  categoria      VARCHAR(100),
  descrizione    TEXT,
  cover_path     TEXT,
  thumb_path     TEXT,
  disponibile    BOOLEAN      NOT NULL DEFAULT TRUE,
  visualizzazioni INTEGER     NOT NULL DEFAULT 0,
  utente_id      INTEGER      NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  /* Tipo geometry con SRID 4326 (WGS84) */
  posizione      GEOMETRY(Point, 4326) NOT NULL,
  creato_il      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  aggiornato_il  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_libri_posizione ON libri USING GIST(posizione);
CREATE INDEX IF NOT EXISTS idx_libri_categoria ON libri(categoria);
CREATE INDEX IF NOT EXISTS idx_libri_utente ON libri(utente_id);

/*TABELLA: richieste_prestito */

CREATE TABLE IF NOT EXISTS richieste_prestito (
  id              SERIAL PRIMARY KEY,
  libro_id        INTEGER      NOT NULL REFERENCES libri(id) ON DELETE CASCADE,
  richiedente_id  INTEGER      NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  stato           VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                  CHECK (stato IN ('pendente', 'accettata', 'rifiutata')),
  messaggio       TEXT,
  creato_il       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestiti_libro   ON richieste_prestito(libro_id);
CREATE INDEX IF NOT EXISTS idx_prestiti_richied ON richieste_prestito(richiedente_id);

/*  Aggiorna aggiornato_il automaticamente */ 

CREATE OR REPLACE FUNCTION update_aggiornato_il()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aggiornato_il = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_utenti_updated ON utenti;
CREATE TRIGGER trg_utenti_updated
  BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_aggiornato_il();

DROP TRIGGER IF EXISTS trg_libri_updated ON libri;
CREATE TRIGGER trg_libri_updated
  BEFORE UPDATE ON libri
  FOR EACH ROW EXECUTE FUNCTION update_aggiornato_il();

/*  DATI DI TEST (seed) */
/*  Password per tutti gli utenti di test: "password" */
/*  (hash bcrypt con 12 rounds) */

INSERT INTO utenti (nome, cognome, email, password_hash, bio) VALUES
('Andrea', 'Masu', 'andrea.masu@nearbook.com', '$2b$12$ZvnIvjCfmmQwcJGUvYoQtudB2hI2dpWRv9j7ITpVYR1DT6H9Q7CE.', 'Appassionato di lettura e sviluppo software. Milano centro.'),
('Sara', 'Rossi', 'sara.rossi@nearbook.com', '$2b$12$ZvnIvjCfmmQwcJGUvYoQtudB2hI2dpWRv9j7ITpVYR1DT6H9Q7CE.', 'Amo i romanzi storici e i saggi di filosofia.'),
('Luca', 'Bianchi', 'luca.bianchi@nearbook.com', '$2b$12$ZvnIvjCfmmQwcJGUvYoQtudB2hI2dpWRv9j7ITpVYR1DT6H9Q7CE.', 'Lettore vorace, specializzato in sci-fi e fantasy.'),
('Giulia', 'Ferrari', 'giulia.ferrari@nearbook.com', '$2b$12$ZvnIvjCfmmQwcJGUvYoQtudB2hI2dpWRv9j7ITpVYR1DT6H9Q7CE.', 'Bibliofila e insegnante. Quartiere Isola, Milano.'),
('Demo', 'User', 'demo@nearbook.it', '$2b$12$ZvnIvjCfmmQwcJGUvYoQtudB2hI2dpWRv9j7ITpVYR1DT6H9Q7CE.', 'Account demo NearBook.')
ON CONFLICT (email) DO NOTHING;

/*  Libri di test attorno a Milano centro */ 

INSERT INTO libri (titolo, autore, anno, categoria, descrizione, disponibile, visualizzazioni, utente_id, posizione) VALUES
('Il nome della rosa', 'Umberto Eco', 1980, 'Romanzo', 'Capolavoro del romanzo storico ambientato in un monastero medievale.', TRUE, 34, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1919, 45.4641), 4326)),
('Sapiens', 'Yuval Noah Harari', 2011, 'Saggio', 'Una breve storia dell''umanità dalle origini a oggi.', TRUE, 45, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1930, 45.4650), 4326)),
('Dune', 'Frank Herbert', 1965, 'Sci-fi', 'Epopea fantascientifica su potere, ecologia e religione.', TRUE, 21, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1780, 45.4530), 4326)),
('1984', 'George Orwell', 1949, 'Romanzo', 'Il classico distopico sul totalitarismo e la sorveglianza di massa.', TRUE, 58, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1760, 45.4520), 4326)),
('Gomorra', 'Roberto Saviano', 2006, 'Saggio', 'Inchiesta sull''empire criminale della camorra napoletana.', TRUE, 29, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.2030, 45.4700), 4326)),
('Fahrenheit 451', 'Ray Bradbury', 1953, 'Sci-fi', 'Distopia letteraria sulla censura e il potere dei libri.', TRUE, 17, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.2050, 45.4710), 4326)),
('Cent''anni di solitudine', 'Gabriel García Márquez', 1967, 'Romanzo', 'Il capolavoro del realismo magico latinoamericano.', FALSE, 62, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.2010, 45.4690), 4326)),
('La storia', 'Elsa Morante', 1974, 'Storia', 'Romanzo corale che racconta la Seconda Guerra Mondiale a Roma.', TRUE, 38, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1870, 45.4870), 4326)),
('Il signore degli anelli', 'J.R.R. Tolkien', 1954, 'Fantasy', 'L''epopea fantasy per eccellenza: la saga dell''Anello.', TRUE, 91, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1880, 45.4860), 4326)),
('Poesia in forma di rosa', 'Pier Paolo Pasolini', 1964, 'Poesia', 'Raccolta poetica tra le più intense del Novecento italiano.', TRUE, 15, (SELECT id FROM utenti WHERE email='demo@nearbook.it'), ST_SetSRID(ST_MakePoint(9.1860, 45.4875), 4326));

/*  Richieste di prestito di esempio */

INSERT INTO richieste_prestito (libro_id, richiedente_id, stato, messaggio) VALUES
((SELECT id FROM libri WHERE titolo='Dune' LIMIT 1), (SELECT id FROM utenti WHERE email='andrea.masu@nearbook.com'), 'pendente', 'Ciao Sara, posso prendere in prestito Dune per due settimane?'),
((SELECT id FROM libri WHERE titolo='Il nome della rosa' LIMIT 1), (SELECT id FROM utenti WHERE email='sara.rossi@nearbook.com'), 'accettata', 'Ho sempre voluto leggere Eco! Quando possiamo incontrarci?'),
((SELECT id FROM libri WHERE titolo='Il signore degli anelli' LIMIT 1), (SELECT id FROM utenti WHERE email='andrea.masu@nearbook.com'), 'pendente', 'Il Signore degli Anelli è nella mia lista da anni!'),
((SELECT id FROM libri WHERE titolo='Gomorra' LIMIT 1), (SELECT id FROM utenti WHERE email='giulia.ferrari@nearbook.com'), 'rifiutata', 'Purtroppo l''ho già prestato a qualcuno, mi dispiace.');