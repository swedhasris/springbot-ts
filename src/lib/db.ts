/**
 * src/lib/db.ts
 * 
 * Unified database utility module for ConnectIT / Nexus.
 * 
 * Priority order:
 * 1. MySQL (primary — set MYSQL_PASSWORD in .env to activate)
 * 2. SQLite (automatic fallback when MySQL is unavailable)
 * 
 * Never import 'sqlite3' or 'mysql2' directly in server code — use this module.
 */

import mysql from 'mysql2/promise';
import { config as loadEnv } from 'dotenv';

loadEnv();

// ─── Configuration ────────────────────────────────────────────────────────────

const dbConfig: mysql.PoolOptions = {
 host: process.env.MYSQL_HOST || 'localhost',
 port: parseInt(process.env.MYSQL_PORT || '3306'),
 user: process.env.MYSQL_USER || 'root',
 password: process.env.MYSQL_PASSWORD || '',
 database: process.env.MYSQL_DATABASE || 'connectit_db',
 waitForConnections: true,
 connectionLimit: 15,
 queueLimit: 0,
 enableKeepAlive: true,
 keepAliveInitialDelay: 30000,
 connectTimeout: 10000,
 // Performance: reuse connections efficiently
 multipleStatements: false,
};

// ─── State ────────────────────────────────────────────────────────────────────

let pool: mysql.Pool | null = null;
let sqliteDb: any = null;
let useSQLite = false;
let mysqlCheckInProgress = false;

// In-memory cache for frequently read data (SLA policies, system settings)
const memCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 60 second cache

// ─── SQLite Fallback ──────────────────────────────────────────────────────────

export async function getSQLiteDb() {
 if (!sqliteDb) {
 const { open } = await import('sqlite');
 const sqlite3Module = await import('sqlite3');
 const sqlite3 = (sqlite3Module as any).default || sqlite3Module;
 sqliteDb = await open({
 filename: './timesheet.sqlite',
 driver: sqlite3.Database
 });
 // Performance: WAL mode for better concurrent access
 await sqliteDb.exec('PRAGMA journal_mode=WAL');
 await sqliteDb.exec('PRAGMA cache_size=10000');
 await sqliteDb.exec('PRAGMA synchronous=NORMAL');
 await sqliteDb.exec('PRAGMA temp_store=MEMORY');
 console.log('[SQLite] Opened with WAL mode');
 }
 return sqliteDb;
}

export function setUseSQLite(val: boolean) {
 useSQLite = val;
 if (val) {
 console.log('[DB] Switched to SQLite fallback mode');
 }
}

export function isUsingSQLite(): boolean {
 return useSQLite;
}

// ─── MySQL Pool ───────────────────────────────────────────────────────────────

function getPool(): mysql.Pool {
 if (!pool) {
 pool = mysql.createPool(dbConfig);
 console.log(`[MySQL] Pool created: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
 }
 return pool;
}

/**
 * Test MySQL connectivity. Returns true if connected, false if not.
 * Does NOT switch to SQLite — caller decides.
 */
export async function testMySQLConnection(): Promise<boolean> {
 if (mysqlCheckInProgress) return false;
 mysqlCheckInProgress = true;
 try {
 const conn = await getPool().getConnection();
 await conn.query('SELECT 1');
 conn.release();
 mysqlCheckInProgress = false;
 return true;
 } catch (err: any) {
 mysqlCheckInProgress = false;
 return false;
 }
}

// ─── Core Query Functions ─────────────────────────────────────────────────────

/**
 * Execute a SELECT query and return rows.
 * Automatically falls back to SQLite if MySQL is unavailable.
 */
export async function query(sql: string, values?: any[]): Promise<any[]> {
 if (useSQLite) {
 const db = await getSQLiteDb();
 try {
 return await db.all(sql, values || []);
 } catch (err: any) {
 console.error('[SQLite Query Error]', err.message, '| SQL:', sql.slice(0, 100));
 throw err;
 }
 }

 try {
 const [rows] = await getPool().execute(sql, values);
 return rows as any[];
 } catch (err: any) {
 console.error('[MySQL Query Error]', err.message, '| SQL:', sql.slice(0, 100));
 // Attempt SQLite fallback for non-fatal errors
 if (
 err.code === 'ECONNREFUSED' || 
 err.code === 'ER_ACCESS_DENIED_ERROR' ||
 err.code === 'PROTOCOL_CONNECTION_LOST' ||
 err.fatal
 ) {
 console.warn('[DB] MySQL unavailable, using SQLite fallback');
 useSQLite = true;
 const db = await getSQLiteDb();
 return await db.all(sql, values || []);
 }
 throw err;
 }
}

/**
 * Execute an INSERT/UPDATE/DELETE and return result with insertId and affectedRows.
 */
export async function execute(sql: string, values?: any[]): Promise<any> {
 if (useSQLite) {
 const db = await getSQLiteDb();
 try {
 const result = await db.run(sql, values || []);
 return { insertId: result.lastID, affectedRows: result.changes };
 } catch (err: any) {
 console.error('[SQLite Execute Error]', err.message, '| SQL:', sql.slice(0, 100));
 throw err;
 }
 }

 try {
 const [result] = await getPool().execute(sql, values);
 return result as mysql.ResultSetHeader;
 } catch (err: any) {
 console.error('[MySQL Execute Error]', err.message, '| SQL:', sql.slice(0, 100));
 if (
 err.code === 'ECONNREFUSED' ||
 err.code === 'ER_ACCESS_DENIED_ERROR' ||
 err.code === 'PROTOCOL_CONNECTION_LOST' ||
 err.fatal
 ) {
 console.warn('[DB] MySQL unavailable, using SQLite fallback');
 useSQLite = true;
 const db = await getSQLiteDb();
 const result = await db.run(sql, values || []);
 return { insertId: result.lastID, affectedRows: result.changes };
 }
 throw err;
 }
}

/**
 * Execute multiple queries in a single MySQL transaction.
 * On SQLite, executes sequentially (no rollback on error).
 */
export async function withTransaction<T>(
 fn: (conn: { query: typeof query; execute: typeof execute }) => Promise<T>
): Promise<T> {
 if (useSQLite) {
 // SQLite: best-effort sequential execution
 const db = await getSQLiteDb();
 await db.run('BEGIN');
 try {
 const result = await fn({ query, execute });
 await db.run('COMMIT');
 return result;
 } catch (err) {
 await db.run('ROLLBACK').catch(() => {});
 throw err;
 }
 }

 const conn = await getPool().getConnection();
 await conn.beginTransaction();
 try {
 const connQuery = async (sql: string, values?: any[]) => {
 const [rows] = await conn.execute(sql, values || []);
 return rows as any[];
 };
 const connExecute = async (sql: string, values?: any[]) => {
 const [result] = await conn.execute(sql, values || []);
 return result as mysql.ResultSetHeader;
 };
 const result = await fn({ query: connQuery, execute: connExecute });
 await conn.commit();
 return result;
 } catch (err) {
 await conn.rollback();
 throw err;
 } finally {
 conn.release();
 }
}

// ─── Cached Query ─────────────────────────────────────────────────────────────

/**
 * Query with in-memory caching. Great for SLA policies, system settings, etc.
 * Cache expires after 60 seconds.
 */
export async function cachedQuery(cacheKey: string, sql: string, values?: any[]): Promise<any[]> {
 const cached = memCache.get(cacheKey);
 if (cached && Date.now() < cached.expiry) {
 return cached.data;
 }
 const data = await query(sql, values);
 memCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });
 return data;
}

export function invalidateCache(cacheKey?: string) {
 if (cacheKey) {
 memCache.delete(cacheKey);
 } else {
 memCache.clear();
 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null): string | null {
 if (!date) return null;
 const d = typeof date === 'string' ? new Date(date) : date;
 if (isNaN(d.getTime())) return null;
 return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Safely escape a LIKE pattern for SQL.
 */
export function escapeLike(str: string): string {
 return str.replace(/[%_\\]/g, c => '\\' + c);
}

/**
 * Build a safe ORDER BY clause (prevents injection).
 * Only allows known column names and directions.
 */
export function safeOrderBy(
 column: string,
 direction: 'ASC' | 'DESC' = 'ASC',
 allowedColumns: string[]
): string {
 const safeCol = allowedColumns.includes(column) ? column : allowedColumns[0];
 const safeDir = direction === 'DESC' ? 'DESC' : 'ASC';
 return `${safeCol} ${safeDir}`;
}

// ─── Database Health Check ────────────────────────────────────────────────────

export async function getDatabaseStatus(): Promise<{
 mode: 'mysql' | 'sqlite';
 connected: boolean;
 database: string;
 host: string;
}> {
 if (useSQLite) {
 return {
 mode: 'sqlite',
 connected: true,
 database: './timesheet.sqlite',
 host: 'local'
 };
 }

 const connected = await testMySQLConnection();
 return {
 mode: 'mysql',
 connected,
 database: dbConfig.database as string,
 host: `${dbConfig.host}:${dbConfig.port}`
 };
}
