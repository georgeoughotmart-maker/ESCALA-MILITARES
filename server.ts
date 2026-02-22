import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-militar';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    coat_of_arms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    default_value REAL DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    default_workload TEXT DEFAULT '24h',
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    value REAL DEFAULT 0,
    notes TEXT,
    reminder_enabled INTEGER DEFAULT 0,
    reminder_before_hours INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (type_id) REFERENCES service_types (id)
  );
`);

const app = express();
app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword);
    
    // Create default service types for new user
    const defaultTypes = [
      { name: 'Ordinário', value: 0, color: '#3b82f6', workload: '24h' },
      { name: 'PJES', value: 200, color: '#10b981', workload: '12h' },
      { name: 'Diária', value: 150, color: '#f59e0b', workload: '8h' },
      { name: 'Extra', value: 100, color: '#ef4444', workload: '6h' }
    ];
    
    const typeStmt = db.prepare('INSERT INTO service_types (user_id, name, default_value, color, default_workload) VALUES (?, ?, ?, ?, ?)');
    for (const type of defaultTypes) {
      typeStmt.run(info.lastInsertRowid, type.name, type.value, type.color, type.workload);
    }

    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error: any) {
    res.status(400).json({ error: 'Email já cadastrado ou dados inválidos' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, coat_of_arms: user.coat_of_arms } });
});

// User Profile
app.put('/api/user/profile', authenticateToken, (req: any, res) => {
  const { name, coat_of_arms } = req.body;
  db.prepare('UPDATE users SET name = ?, coat_of_arms = ? WHERE id = ?')
    .run(name, coat_of_arms, req.user.id);
  res.json({ message: 'Perfil atualizado' });
});

// Service Types
app.get('/api/service-types', authenticateToken, (req: any, res) => {
  const types = db.prepare('SELECT * FROM service_types WHERE user_id = ?').all(req.user.id);
  res.json(types);
});

app.post('/api/service-types', authenticateToken, (req: any, res) => {
  const { name, default_value, color, default_workload } = req.body;
  const stmt = db.prepare('INSERT INTO service_types (user_id, name, default_value, color, default_workload) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(req.user.id, name, default_value, color, default_workload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/service-types/:id', authenticateToken, (req: any, res) => {
  const { name, default_value, color, default_workload } = req.body;
  db.prepare('UPDATE service_types SET name = ?, default_value = ?, color = ?, default_workload = ? WHERE id = ? AND user_id = ?')
    .run(name, default_value, color, default_workload, req.params.id, req.user.id);
  res.json({ message: 'Tipo de serviço atualizado' });
});

app.delete('/api/service-types/:id', authenticateToken, (req: any, res) => {
  db.prepare('DELETE FROM service_types WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Tipo de serviço excluído' });
});

// Services
app.get('/api/services', authenticateToken, (req: any, res) => {
  const services = db.prepare(`
    SELECT s.*, st.name as type_name, st.color as type_color 
    FROM services s 
    JOIN service_types st ON s.type_id = st.id 
    WHERE s.user_id = ?
    ORDER BY s.date DESC
  `).all(req.user.id);
  res.json(services);
});

app.post('/api/services', authenticateToken, (req: any, res) => {
  const { type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours } = req.body;
  const stmt = db.prepare(`
    INSERT INTO services (user_id, type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(req.user.id, type_id, date, start_time, end_time, value, notes, reminder_enabled ? 1 : 0, reminder_before_hours);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/services/:id', authenticateToken, (req: any, res) => {
  const { type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours } = req.body;
  db.prepare(`
    UPDATE services 
    SET type_id = ?, date = ?, start_time = ?, end_time = ?, value = ?, notes = ?, reminder_enabled = ?, reminder_before_hours = ? 
    WHERE id = ? AND user_id = ?
  `).run(type_id, date, start_time, end_time, value, notes, reminder_enabled ? 1 : 0, reminder_before_hours, req.params.id, req.user.id);
  res.json({ message: 'Serviço atualizado' });
});

app.delete('/api/services/:id', authenticateToken, (req: any, res) => {
  db.prepare('DELETE FROM services WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Serviço excluído' });
});

// Dashboard Stats
app.get('/api/stats', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const monthlyStats = db.prepare(`
    SELECT 
      COUNT(*) as total_services,
      COALESCE(SUM(value), 0) as total_value,
      COALESCE(SUM(CASE 
        WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 
          (strftime('%s', date || ' ' || end_time) - strftime('%s', date || ' ' || start_time)) / 3600.0
        ELSE 0 
      END), 0) as total_hours
    FROM services 
    WHERE user_id = ? AND date LIKE ?
  `).get(userId, `${month}%`) as any;

  const nextService = db.prepare(`
    SELECT s.*, st.name as type_name, st.color as type_color 
    FROM services s 
    JOIN service_types st ON s.type_id = st.id 
    WHERE s.user_id = ? AND s.date >= ?
    ORDER BY s.date ASC, s.start_time ASC
    LIMIT 1
  `).get(userId, new Date().toISOString().slice(0, 10));

  res.json({
    monthly: monthlyStats || { total_services: 0, total_value: 0, total_hours: 0 },
    nextService
  });
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
