// ─── Database Service ────────────────────────────────────────────────────────
// SQLite wrapper with typed helpers for the DatalakeEdge attendance system

import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface AttendanceLog {
  id: number;
  employee_id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'SPOOFING_REJECTED';
  challenge_type: string;
  sequence_hash: string;
  location: string;
  inference_ms: number;
  confidence: number;
}

export interface RegisteredEmployee {
  employee_id: string;
  registered_at: string;
  name?: string;
  designation?: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export const DatabaseService = {
  // ── Init ─────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    try {
      db = await SQLite.openDatabase({
        name: 'DatalakeLogs.db',
        location: 'default',
      });
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS attendance (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id     TEXT    NOT NULL,
          timestamp       TEXT    NOT NULL,
          status          TEXT    NOT NULL,
          challenge_type  TEXT    DEFAULT '',
          location        TEXT    DEFAULT '',
          sequence_hash   TEXT    DEFAULT '',
          inference_ms    REAL    DEFAULT 0,
          confidence      REAL    DEFAULT 0
        );
      `);
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS employees (
          employee_id   TEXT PRIMARY KEY,
          registered_at TEXT NOT NULL,
          name          TEXT DEFAULT '',
          designation   TEXT DEFAULT ''
        );
      `);
      // Migration: add new columns if they don't exist (safe ALTER TABLE)
      try {
        await db.executeSql(`ALTER TABLE attendance ADD COLUMN sequence_hash TEXT DEFAULT '';`);
      } catch (_) { /* Column already exists — ignore */ }
      try {
        await db.executeSql(`ALTER TABLE attendance ADD COLUMN inference_ms REAL DEFAULT 0;`);
      } catch (_) { /* Column already exists — ignore */ }
      try {
        await db.executeSql(`ALTER TABLE attendance ADD COLUMN confidence REAL DEFAULT 0;`);
      } catch (_) { /* Column already exists — ignore */ }
      console.log('[DB] Database initialised successfully');
    } catch (error) {
      console.error('[DB] Initialisation failed:', error);
      throw error;
    }
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  async logAttendance(params: {
    employeeId: string;
    status: AttendanceLog['status'];
    challengeType: string;
    sequenceHash?: string;
    location?: string;
    inferenceMs?: number;
    confidence?: number;
  }): Promise<void> {
    if (!db) throw new Error('Database not initialised');
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    await db.executeSql(
      `INSERT INTO attendance
        (employee_id, timestamp, status, challenge_type, location, sequence_hash, inference_ms, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        params.employeeId,
        timestamp,
        params.status,
        params.challengeType,
        params.location ?? 'NHAI Site',
        params.sequenceHash ?? '',
        params.inferenceMs ?? 0,
        params.confidence ?? 0,
      ],
    );
  },

  async getLogs(limit = 50): Promise<AttendanceLog[]> {
    if (!db) throw new Error('Database not initialised');
    const [result] = await db.executeSql(
      'SELECT * FROM attendance ORDER BY id DESC LIMIT ?;',
      [limit],
    );
    const rows: AttendanceLog[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }
    return rows;
  },

  async getLogStats(): Promise<{ total: number; success: number; failed: number }> {
    if (!db) throw new Error('Database not initialised');
    const [total] = await db.executeSql('SELECT COUNT(*) as cnt FROM attendance;');
    const [success] = await db.executeSql(
      "SELECT COUNT(*) as cnt FROM attendance WHERE status = 'SUCCESS';",
    );
    const [failed] = await db.executeSql(
      "SELECT COUNT(*) as cnt FROM attendance WHERE status != 'SUCCESS';",
    );
    return {
      total: total.rows.item(0).cnt,
      success: success.rows.item(0).cnt,
      failed: failed.rows.item(0).cnt,
    };
  },

  async deleteAllLogs(): Promise<void> {
    if (!db) throw new Error('Database not initialised');
    await db.executeSql('DELETE FROM attendance;');
  },

  // ── Employees ─────────────────────────────────────────────────────────────
  async registerEmployee(params: {
    employeeId: string;
    name?: string;
    designation?: string;
  }): Promise<void> {
    if (!db) throw new Error('Database not initialised');
    const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await db.executeSql(
      `INSERT OR REPLACE INTO employees (employee_id, registered_at, name, designation)
       VALUES (?, ?, ?, ?);`,
      [params.employeeId, ts, params.name ?? '', params.designation ?? ''],
    );
  },

  async getEmployees(): Promise<RegisteredEmployee[]> {
    if (!db) throw new Error('Database not initialised');
    const [result] = await db.executeSql(
      'SELECT * FROM employees ORDER BY registered_at DESC;',
    );
    const rows: RegisteredEmployee[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }
    return rows;
  },

  async getEmployeeCount(): Promise<number> {
    if (!db) throw new Error('Database not initialised');
    const [result] = await db.executeSql('SELECT COUNT(*) as cnt FROM employees;');
    return result.rows.item(0).cnt;
  },

  async employeeExists(employeeId: string): Promise<boolean> {
    if (!db) throw new Error('Database not initialised');
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as cnt FROM employees WHERE employee_id = ?;',
      [employeeId],
    );
    return result.rows.item(0).cnt > 0;
  },

  async removeEmployee(employeeId: string): Promise<void> {
    if (!db) throw new Error('Database not initialised');
    await db.executeSql('DELETE FROM employees WHERE employee_id = ?;', [employeeId]);
  },
};

export default DatabaseService;
