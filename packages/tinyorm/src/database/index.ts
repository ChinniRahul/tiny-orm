import Database, { Database as SQLiteDatabase } from 'better-sqlite3';
import { SchemaDefinition } from '../schema/types';

export class TinyORM<S extends SchemaDefinition> {
  private db: SQLiteDatabase;
  public schema: S;
  public logger?: (query: string, params: any[], duration: number) => void;

  constructor(dbPath: string, schema: S, options?: { logger?: (query: string, params: any[], duration: number) => void }) {
    this.db = new Database(dbPath);
    this.schema = schema;
    this.logger = options?.logger;
  }

  // Raw query execution
  public query(sql: string, params: any[] = []): any[] {
    const start = performance.now();
    const stmt = this.db.prepare(sql);
    const result = stmt.all(params);
    const duration = performance.now() - start;

    if (this.logger) {
      this.logger(sql, params, duration);
    }

    return result;
  }

  public execute(sql: string, params: any[] = []): any {
    const start = performance.now();
    const stmt = this.db.prepare(sql);
    const result = stmt.run(params);
    const duration = performance.now() - start;

    if (this.logger) {
      this.logger(sql, params, duration);
    }

    return result;
  }

  public exec(sql: string): void {
    const start = performance.now();
    this.db.exec(sql);
    const duration = performance.now() - start;

    if (this.logger) {
      this.logger(sql, [], duration);
    }
  }

  public get(sql: string, params: any[] = []): any {
    const start = performance.now();
    const stmt = this.db.prepare(sql);
    const result = stmt.get(params);
    const duration = performance.now() - start;

    if (this.logger) {
      this.logger(sql, params, duration);
    }

    return result;
  }

  public async transaction<T>(callback: (tx: TinyORM<S>) => Promise<T>): Promise<T> {
    // In better-sqlite3, transactions are synchronous, but to support an async API
    // we can use a savepoint or standard BEGIN/COMMIT if it's the only one.
    // better-sqlite3 db.transaction returns a function that executes inside a transaction.
    // However, it expects a synchronous callback. If we want to support async logic inside,
    // we have to manage it manually or use async/await carefully since it might block.
    // We'll manage standard BEGIN, COMMIT, ROLLBACK manually for async support.
    
    this.execute('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      this.execute('COMMIT');
      return result;
    } catch (error) {
      this.execute('ROLLBACK');
      throw error;
    }
  }
}
