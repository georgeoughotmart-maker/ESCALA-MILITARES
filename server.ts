import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-militar';

// Database Configuration
const isTurso = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_URL);
const isVercel = !!process.env.VERCEL;
let db: any;

let url = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || (isVercel ? 'file:/tmp/database.db' : 'file:database.db')).trim().replace(/['"]/g, '');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim().replace(/['"]/g, '');

// Ensure Turso URL has a protocol
if (isTurso && !url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('http://')) {
  url = `libsql://${url}`;
}

let client = createClient({
  url: url!,
  authToken: authToken,
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

// Wrapper for LibSQL to mimic better-sqlite3 basic API
db = {
  exec: async (sql: string) => {
    const statements = sql.split(';').filter(s => s.trim());
    for (const s of statements) {
      await client.execute(s);
    }
  },
  prepare: (sql: string) => ({
    run: async (...args: any[]) => {
      const normalizedArgs = args.map(arg => arg === undefined ? null : arg);
      const res = await client.execute({ sql, args: normalizedArgs });
      return { 
        lastInsertRowid: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null) 
          ? Number(res.lastInsertRowid) 
          : null 
      };
    },
    get: async (...args: any[]) => {
      const normalizedArgs = args.map(arg => arg === undefined ? null : arg);
      const res = await client.execute({ sql, args: normalizedArgs });
      if (!res.rows[0]) return null;
      return normalizeRows([res.rows[0]])[0];
    },
    all: async (...args: any[]) => {
      const normalizedArgs = args.map(arg => arg === undefined ? null : arg);
      const res = await client.execute({ sql, args: normalizedArgs });
      return normalizeRows(res.rows);
    }
  }),
  pragma: async (sql: string) => {
    try {
      const res = await client.execute(`PRAGMA ${sql}`);
      const row = res.rows[0];
      if (!row) return null;
      const val = Object.values(row)[0];
      return typeof val === 'bigint' ? Number(val) : val;
    } catch (e) {
      console.warn(`PRAGMA ${sql} not supported or failed:`, e);
      return null;
    }
  }
};

const forceRecreateDb = async (resolvedPath: string, reason: string) => {
  console.error(`[Self-Healing] Triggered force recreate due to: ${reason}`);
  try {
    const suffix = `_corrupted_${Date.now()}`;
    const filesToRename = [
      resolvedPath,
      `${resolvedPath}-wal`,
      `${resolvedPath}-shm`,
      `${resolvedPath}-journal`
    ];
    
    for (const file of filesToRename) {
      if (fs.existsSync(file)) {
        try {
          fs.renameSync(file, `${file}${suffix}`);
          console.log(`[Self-Healing] Renamed ${file} to ${file}${suffix}`);
        } catch (e) {
          console.error(`[Self-Healing] Failed to rename companion file ${file}:`, e);
          try {
            fs.unlinkSync(file);
            console.log(`[Self-Healing] Deleted locked/companion file ${file}`);
          } catch (delErr) {
            console.error(`[Self-Healing] Failed to delete ${file}:`, delErr);
          }
        }
      }
    }

    // Re-create the LibSQL client
    client = createClient({
      url: url!,
      authToken: authToken,
    });
    console.log('[Self-Healing] Client re-created successfully after clearing corrupted files');
  } catch (err) {
    console.error('[Self-Healing] Error during database reset:', err);
  }
};

const checkAndCleanCorruptedDb = async () => {
  if (!url.startsWith('file:')) return;
  
  const filePath = url.slice(5); // remove 'file:'
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(resolvedPath)) return;
  
  try {
    // Attempt a check read query from the master catalog table to guarantee actual accessibility
    await client.execute('SELECT count(*) FROM sqlite_master');
    console.log('Database integrity check passed.');
  } catch (error: any) {
    if (error && error.message && (error.message.includes('SQLITE_CORRUPT') || error.message.includes('malformed') || error.message.includes('corrupt'))) {
      await forceRecreateDb(resolvedPath, error.message);
    } else {
      console.error('Integrity query failed with other error:', error);
    }
  }
};

let dbInitialized = false;
const initDb = async () => {
  if (dbInitialized) return;
  await checkAndCleanCorruptedDb();
  console.log('Initializing database tables...');
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
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
        reminder_sent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES service_types (id) ON DELETE SET NULL
      );
    `);
    
    // Migration: Add coat_of_arms if missing
    try {
      const columns = await db.prepare("PRAGMA table_info(users)").all();
      if (columns && Array.isArray(columns)) {
        if (!columns.find((c: any) => c.name === 'coat_of_arms')) {
          await db.exec("ALTER TABLE users ADD COLUMN coat_of_arms TEXT");
        }
        if (!columns.find((c: any) => c.name === 'phone')) {
          await db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
        }
      }
      
      const serviceColumns = await db.prepare("PRAGMA table_info(services)").all();
      if (serviceColumns && Array.isArray(serviceColumns)) {
        if (!serviceColumns.find((c: any) => c.name === 'reminder_sent')) {
          await db.exec("ALTER TABLE services ADD COLUMN reminder_sent INTEGER DEFAULT 0");
        }
      }
    } catch (e) {
      console.error("Migration error:", e);
    }

    dbInitialized = true;
    console.log('Database initialized successfully');
  } catch (error: any) {
    console.error('Error in initDb:', error);
    if (error && error.message && (error.message.includes('SQLITE_CORRUPT') || error.message.includes('malformed') || error.message.includes('corrupt'))) {
      if (url.startsWith('file:')) {
        const filePath = url.slice(5);
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        console.error('Corruption detected in initDb execution! Attempting immediate database recreation...');
        try {
          await forceRecreateDb(resolvedPath, error.message);
          // Try to execute configuration again
          await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              phone TEXT,
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
              reminder_sent INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
              FOREIGN KEY (type_id) REFERENCES service_types (id) ON DELETE SET NULL
            );
          `);
          dbInitialized = true;
          console.log('[Self-Healing] Recreated and successfully initialized tables after corruption recovery.');
          return;
        } catch (retryErr) {
          console.error('[Self-Healing] Serious err: recovery database initialization retry failed as well:', retryErr);
        }
      }
    }
    throw error;
  }
};

const app = express();
export default app;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.coat_of_arms && typeof safeBody.coat_of_arms === 'string') {
      safeBody.coat_of_arms = `(Base64 string, length: ${safeBody.coat_of_arms.length})`;
    }
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

// Health Check with DB Status
app.get('/api/health', async (req, res) => {
  try {
    await initDb();
    const fkStatus = await db.pragma('foreign_keys');
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const typeCount = await db.prepare('SELECT COUNT(*) as count FROM service_types').get();
    
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      db: isTurso ? 'turso' : 'local',
      vercel: isVercel,
      foreign_keys: fkStatus === 1 || fkStatus === 'on' ? 'enabled' : 'disabled',
      counts: {
        users: userCount?.count || 0,
        service_types: typeCount?.count || 0
      }
    });
  } catch (e: any) {
    console.error('Health check failed:', e);
    res.status(500).json({ 
      status: 'error', 
      message: 'DB connection failed', 
      error: e.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : e.stack
    });
  }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    await initDb();
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
    await initDb(); // Ensure DB is ready
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user: any = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    console.log('User found:', !!user);

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET);
    console.log('Login successful for:', email);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, coat_of_arms: user.coat_of_arms } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login: ' + error.message });
  }
});

// User Profile
app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const { name, phone, coat_of_arms } = req.body;
    const userId = req.user.id;
    
    console.log(`Updating profile for user ${userId}`);
    
    // Get current user to preserve values if not provided
    const currentUser: any = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    const finalName = name !== undefined ? name : currentUser.name;
    const finalPhone = phone !== undefined ? phone : currentUser.phone;
    const finalCoatOfArms = coat_of_arms !== undefined ? coat_of_arms : currentUser.coat_of_arms;

    await db.prepare('UPDATE users SET name = ?, phone = ?, coat_of_arms = ? WHERE id = ?')
      .run(finalName, finalPhone, finalCoatOfArms, userId);
    
    res.json({ message: 'Perfil atualizado' });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil: ' + error.message });
  }
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

// --- Reminder Service ---
const checkReminders = async () => {
  try {
    if (!dbInitialized) return;
    
    const now = new Date();
    const services = await db.prepare(`
      SELECT s.*, u.phone, u.name as user_name, st.name as type_name
      FROM services s
      JOIN users u ON s.user_id = u.id
      JOIN service_types st ON s.type_id = st.id
      WHERE s.reminder_enabled = 1 
      AND s.reminder_sent = 0
      AND u.phone IS NOT NULL
      AND u.phone != ''
    `).all();

    for (const service of services) {
      const serviceDateTime = new Date(`${service.date}T${service.start_time || '00:00'}`);
      const reminderTime = new Date(serviceDateTime.getTime() - (service.reminder_before_hours * 60 * 60 * 1000));
      
      if (now >= reminderTime && now < serviceDateTime) {
        console.log(`[REMINDER] Sending alert to ${service.phone} for service ${service.type_name} at ${service.date} ${service.start_time}`);
        
        // Here you would integrate Twilio or another SMS/WhatsApp API
        // Example:
        // await sendSMS(service.phone, `Olá ${service.user_name}, lembrete de serviço: ${service.type_name} hoje às ${service.start_time}.`);
        
        await db.prepare('UPDATE services SET reminder_sent = 1 WHERE id = ?').run(service.id);
      }
    }
  } catch (error) {
    console.error('Error in checkReminders:', error);
  }
};

// Check every minute
setInterval(checkReminders, 60000);

// --- Vite Integration ---

async function startServer() {
  console.log('Starting server...');
  
  try {
    await initDb();
  } catch (e) {
    console.error('Initial DB sync failed:', e);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite middleware');
    try {
      const { createServer: createViteServer } = await import('vite');
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
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api')) {
      console.error(`API Error [${req.method} ${req.path}]:`, err);
      return res.status(err.status || 500).json({ 
        error: err.message || 'Erro interno no servidor',
        code: err.code
      });
    }
    next(err);
  });

  // Only listen if not on Vercel
  if (!isVercel) {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  }
}

startServer();
