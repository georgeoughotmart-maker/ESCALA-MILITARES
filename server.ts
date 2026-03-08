import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-militar';

// Database Configuration
const isTurso = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_URL);
let db: any;

if (isTurso) {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
  console.log('Using Turso Database:', url);
  const client = createClient({
    url: url!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const normalizeRows = (rows: any[]) => {
    return rows.map(row => {
      const normalized: any = {};
      for (const key in row) {
        if (typeof row[key] === 'bigint') {
          normalized[key] = Number(row[key]);
        } else {
          normalized[key] = row[key];
        }
      }
      return normalized;
    });
  };

  // Wrapper for Turso to mimic better-sqlite3 basic API
  db = {
    exec: async (sql: string) => {
      const statements = sql.split(';').filter(s => s.trim());
      for (const s of statements) {
        await client.execute(s);
      }
    },
    prepare: (sql: string) => ({
      run: async (...args: any[]) => {
        const res = await client.execute({ sql, args });
        return { 
          lastInsertRowid: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null) 
            ? Number(res.lastInsertRowid) 
            : null 
        };
      },
      get: async (...args: any[]) => {
        const res = await client.execute({ sql, args });
        if (!res.rows[0]) return null;
        return normalizeRows([res.rows[0]])[0];
      },
      all: async (...args: any[]) => {
        const res = await client.execute({ sql, args });
        return normalizeRows(res.rows);
      }
    }),
    pragma: async (sql: string) => {
      const res = await client.execute(`PRAGMA ${sql}`);
      const row = res.rows[0];
      if (!row) return null;
      const val = Object.values(row)[0];
      return typeof val === 'bigint' ? Number(val) : val;
    }
  };
} else {
  console.log('Using Local SQLite');
  const localDb = new Database('database.db');
  localDb.pragma('foreign_keys = ON');
  
  // Wrapper to make it async-compatible with the Turso wrapper
  db = {
    exec: (sql: string) => Promise.resolve(localDb.exec(sql)),
    prepare: (sql: string) => {
      const stmt = localDb.prepare(sql);
      return {
        run: (...args: any[]) => {
          const res = stmt.run(...args);
          return Promise.resolve({ lastInsertRowid: Number(res.lastInsertRowid) });
        },
        get: (...args: any[]) => Promise.resolve(stmt.get(...args)),
        all: (...args: any[]) => Promise.resolve(stmt.all(...args))
      };
    },
    pragma: (sql: string) => Promise.resolve(localDb.pragma(sql, { simple: true }))
  };
}

// Initialize Database
const initDb = async () => {
  console.log('Initializing database tables...');
  try {
    await db.exec(`
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
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type_id INTEGER,
        date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        value REAL DEFAULT 0,
        notes TEXT,
        reminder_enabled INTEGER DEFAULT 0,
        reminder_before_hours INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES service_types (id) ON DELETE SET NULL
      );
    `);
    console.log('Tables initialized successfully');
  } catch (error) {
    console.error('Error in initDb:', error);
    throw error;
  }

  // Migration: Add coat_of_arms if missing
  try {
    if (!isTurso) {
      const columns = await db.prepare("PRAGMA table_info(users)").all();
      if (!columns.find((c: any) => c.name === 'coat_of_arms')) {
        await db.exec("ALTER TABLE users ADD COLUMN coat_of_arms TEXT");
      }
    }
  } catch (e) {
    console.error("Migration error:", e);
  }
};

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    console.log('Body:', JSON.stringify(safeBody));
  }
  next();
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    // Ensure ID is a number even if it was stringified in an old token
    req.user = { ...user, id: Number(user.id) };
    next();
  });
};

// --- API Routes ---

app.get('/api/health', async (req, res) => {
  try {
    const fkStatus = await db.pragma('foreign_keys');
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const typeCount = await db.prepare('SELECT COUNT(*) as count FROM service_types').get();
    
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      db: isTurso ? 'turso' : 'local',
      foreign_keys: fkStatus === 1 || fkStatus === 'on' ? 'enabled' : 'disabled',
      counts: {
        users: userCount?.count || 0,
        service_types: typeCount?.count || 0
      }
    });
  } catch (e: any) {
    res.json({ status: 'error', message: 'DB connection failed', error: e.message });
  }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const info = await stmt.run(name, email, hashedPassword);
    
    const userId = Number(info.lastInsertRowid);
    
    // Create default service types for new user
    const defaultTypes = [
      { name: 'Ordinário', value: 0, color: '#3b82f6', workload: '24h' },
      { name: 'PJES', value: 200, color: '#10b981', workload: '12h' },
      { name: 'Diária', value: 150, color: '#f59e0b', workload: '8h' },
      { name: 'Extra', value: 100, color: '#ef4444', workload: '6h' }
    ];
    
    const typeStmt = db.prepare('INSERT INTO service_types (user_id, name, default_value, color, default_workload) VALUES (?, ?, ?, ?, ?)');
    for (const type of defaultTypes) {
      await typeStmt.run(userId, type.name, type.value, type.color, type.workload);
    }

    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(400).json({ error: 'Email já cadastrado ou dados inválidos' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt:', req.body?.email);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user: any = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    console.log('User found:', !!user);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('Login failed: Invalid credentials');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET);
    console.log('Login successful for:', email);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, coat_of_arms: user.coat_of_arms } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login: ' + error.message });
  }
});

// User Profile
app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  const { name, coat_of_arms } = req.body;
  await db.prepare('UPDATE users SET name = ?, coat_of_arms = ? WHERE id = ?')
    .run(name, coat_of_arms, req.user.id);
  res.json({ message: 'Perfil atualizado' });
});

// Service Types
app.get('/api/service-types', authenticateToken, async (req: any, res) => {
  let types = await db.prepare('SELECT * FROM service_types WHERE user_id = ?').all(req.user.id);
  
  // If user has no types, create defaults
  if (types.length === 0) {
    const defaultTypes = [
      { name: 'Ordinário', value: 0, color: '#3b82f6', workload: '24h' },
      { name: 'PJES', value: 200, color: '#10b981', workload: '12h' },
      { name: 'Diária', value: 150, color: '#f59e0b', workload: '8h' },
      { name: 'Extra', value: 100, color: '#ef4444', workload: '6h' }
    ];
    
    const typeStmt = db.prepare('INSERT INTO service_types (user_id, name, default_value, color, default_workload) VALUES (?, ?, ?, ?, ?)');
    for (const type of defaultTypes) {
      await typeStmt.run(req.user.id, type.name, type.value, type.color, type.workload);
    }
    types = await db.prepare('SELECT * FROM service_types WHERE user_id = ?').all(req.user.id);
  }
  
  res.json(types);
});

app.post('/api/service-types', authenticateToken, async (req: any, res) => {
  try {
    const { name, default_value, color, default_workload } = req.body;
    console.log(`Creating service type for user ${req.user.id}:`, { name, default_value, color, default_workload });
    
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const stmt = db.prepare('INSERT INTO service_types (user_id, name, default_value, color, default_workload) VALUES (?, ?, ?, ?, ?)');
    const info = await stmt.run(req.user.id, name, default_value || 0, color || '#3b82f6', default_workload || '24h');
    
    console.log('Service type created successfully, info:', info);
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  } catch (error: any) {
    console.error('Error creating service type:', error);
    res.status(500).json({ error: 'Erro ao criar tipo de serviço: ' + error.message });
  }
});

app.put('/api/service-types/:id', authenticateToken, async (req: any, res) => {
  try {
    const { name, default_value, color, default_workload } = req.body;
    const typeId = Number(req.params.id);
    console.log(`Updating service type ${typeId} for user ${req.user.id}:`, { name, default_value, color, default_workload });

    const result = await db.prepare('UPDATE service_types SET name = ?, default_value = ?, color = ?, default_workload = ? WHERE id = ? AND user_id = ?')
      .run(name, default_value, color, default_workload, typeId, req.user.id);
    
    console.log('Update result:', result);
    res.json({ message: 'Tipo de serviço atualizado' });
  } catch (error: any) {
    console.error('Error updating service type:', error);
    res.status(500).json({ error: 'Erro ao atualizar tipo de serviço: ' + error.message });
  }
});

app.delete('/api/service-types/:id', authenticateToken, async (req: any, res) => {
  try {
    const typeId = Number(req.params.id);
    const userId = req.user.id;
    
    const type = await db.prepare('SELECT id FROM service_types WHERE id = ? AND user_id = ?').get(typeId, userId);
    if (!type) return res.status(404).json({ error: 'Tipo de serviço não encontrado' });

    await db.prepare('UPDATE services SET type_id = NULL WHERE type_id = ?').run(typeId);
    await db.prepare('DELETE FROM service_types WHERE id = ? AND user_id = ?').run(typeId, userId);
    res.json({ message: 'Tipo de serviço excluído' });
  } catch (error: any) {
    console.error('Error deleting service type:', error);
    res.status(500).json({ error: 'Erro ao excluir tipo de serviço: ' + error.message });
  }
});

// Services
app.get('/api/services', authenticateToken, async (req: any, res) => {
  const services = await db.prepare(`
    SELECT s.*, COALESCE(st.name, 'Tipo Excluído') as type_name, COALESCE(st.color, '#666666') as type_color 
    FROM services s 
    LEFT JOIN service_types st ON s.type_id = st.id 
    WHERE s.user_id = ?
    ORDER BY s.date DESC
  `).all(req.user.id);
  res.json(services);
});

app.post('/api/services', authenticateToken, async (req: any, res) => {
  const { type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours } = req.body;
  const cleanTypeId = type_id && type_id !== '' ? Number(type_id) : null;

  if (cleanTypeId) {
    const type = await db.prepare('SELECT id FROM service_types WHERE id = ? AND user_id = ?').get(cleanTypeId, req.user.id);
    if (!type) return res.status(400).json({ error: 'Tipo de serviço inválido para este usuário' });
  }

  const stmt = db.prepare(`
    INSERT INTO services (user_id, type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = await stmt.run(req.user.id, cleanTypeId, date, start_time, end_time, value, notes, reminder_enabled ? 1 : 0, reminder_before_hours);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/services/:id', authenticateToken, async (req: any, res) => {
  const { type_id, date, start_time, end_time, value, notes, reminder_enabled, reminder_before_hours } = req.body;
  const cleanTypeId = type_id && type_id !== '' ? Number(type_id) : null;

  if (cleanTypeId) {
    const type = await db.prepare('SELECT id FROM service_types WHERE id = ? AND user_id = ?').get(cleanTypeId, req.user.id);
    if (!type) return res.status(400).json({ error: 'Tipo de serviço inválido para este usuário' });
  }

  await db.prepare(`
    UPDATE services 
    SET type_id = ?, date = ?, start_time = ?, end_time = ?, value = ?, notes = ?, reminder_enabled = ?, reminder_before_hours = ? 
    WHERE id = ? AND user_id = ?
  `).run(cleanTypeId, date, start_time, end_time, value, notes, reminder_enabled ? 1 : 0, reminder_before_hours, req.params.id, req.user.id);
  res.json({ message: 'Serviço atualizado' });
});

app.delete('/api/services/:id', authenticateToken, async (req: any, res) => {
  await db.prepare('DELETE FROM services WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Serviço excluído' });
});

// Dashboard Stats
app.get('/api/stats', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

  const monthlyStats = await db.prepare(`
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

  const nextService = await db.prepare(`
    SELECT s.*, COALESCE(st.name, 'Tipo Excluído') as type_name, COALESCE(st.color, '#666666') as type_color 
    FROM services s 
    LEFT JOIN service_types st ON s.type_id = st.id 
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
  console.log('Starting server...');
  
  // Test bcrypt
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('test', salt);
    const match = await bcrypt.compare('test', hash);
    console.log('Bcrypt test:', match ? 'SUCCESS' : 'FAILED');
  } catch (e) {
    console.error('Bcrypt test error:', e);
  }

  try {
    await initDb();
    console.log('Database initialized successfully');
  } catch (e) {
    console.error('Failed to initialize database:', e);
    // Continue starting server even if DB fails, so we can at least see the health page or errors
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite middleware');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      // Manual fallback for index.html in dev mode if vite.middlewares doesn't catch it
      app.get('*', async (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        try {
          const html = await vite.transformIndexHtml(req.url, `
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Escala Militar Pro</title>
              </head>
              <body>
                <div id="root"></div>
                <script type="module" src="/src/main.tsx"></script>
              </body>
            </html>
          `);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e) {
          next(e);
        }
      });
      
      console.log('Vite middleware attached');
    } catch (e) {
      console.error('Failed to start Vite server:', e);
    }
  } else {
    console.log('Starting in production mode');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  
  // API 404 Handler (placed before SPA fallback)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api')) {
      console.error(`API Error [${req.method} ${req.path}]:`, err);
      return res.status(err.status || 500).json({ 
        error: err.message || 'Erro interno no servidor',
        code: err.code,
        details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      });
    }
    next(err);
  });

  // Final Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('FINAL ERROR HANDLER:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: err.message || 'Erro interno do servidor',
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
