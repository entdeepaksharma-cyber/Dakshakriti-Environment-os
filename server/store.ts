import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createInitialDatabase } from './seed.js';
import { AuditLog, DakshakritiDatabase, UserRecord } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'dakshakriti-db.json');
export const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'private');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
    fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
  }
}

class DakshakritiStore {
  private db: DakshakritiDatabase;

  constructor() {
    ensureDirectories();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw) as DakshakritiDatabase;
      } catch {
        this.db = createInitialDatabase();
        this.persist();
      }
    } else {
      this.db = createInitialDatabase();
      this.persist();
    }
  }

  public get data(): DakshakritiDatabase {
    return this.db;
  }

  public persist(): void {
    ensureDirectories();
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  public getPermissionsForRole(roleCode: string): string[] {
    const role = this.db.roles.find((r) => r.code === roleCode);
    return role ? role.permissions : [];
  }

  public hasPermission(user: UserRecord, permissionCode: string): boolean {
    const perms = this.getPermissionsForRole(user.role_code);
    return perms.includes(permissionCode);
  }

  public recordAudit(entry: {
    actor: UserRecord | null;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    outcome: 'success' | 'denied' | 'error';
    details: string;
  }): AuditLog {
    const log: AuditLog = {
      id: `aud-${crypto.randomUUID()}`,
      actor_id: entry.actor ? entry.actor.id : null,
      actor_email: entry.actor ? entry.actor.email : null,
      actor_role: entry.actor ? entry.actor.role_code : null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      outcome: entry.outcome,
      details: entry.details,
      created_at: new Date().toISOString(),
    };
    this.db.audit_logs.unshift(log);
    if (this.db.audit_logs.length > 500) {
      this.db.audit_logs = this.db.audit_logs.slice(0, 500);
    }
    this.persist();
    return log;
  }
}

export const store = new DakshakritiStore();
