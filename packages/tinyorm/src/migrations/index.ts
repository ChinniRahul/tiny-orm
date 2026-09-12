import { TinyORM } from '../database';
import { SchemaDefinition } from '../schema/types';
import * as fs from 'fs';
import * as path from 'path';

export class MigrationRunner<S extends SchemaDefinition> {
  private db: TinyORM<S>;
  private migrationsPath: string;

  constructor(db: TinyORM<S>, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  public async setup() {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS __tinyorm_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async getExecutedMigrations(): Promise<string[]> {
    const rows = this.db.query('SELECT name FROM __tinyorm_migrations');
    return rows.map((r: any) => r.name);
  }

  public async runMigrations() {
    await this.setup();

    if (!fs.existsSync(this.migrationsPath)) {
      console.log('No migrations folder found.');
      return;
    }

    const files = fs.readdirSync(this.migrationsPath).filter(f => f.endsWith('.sql')).sort();
    const executed = await this.getExecutedMigrations();

    for (const file of files) {
      if (!executed.includes(file)) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(this.migrationsPath, file), 'utf8');
        
        await this.db.transaction(async (tx) => {
          tx.exec(sql);
          tx.execute('INSERT INTO __tinyorm_migrations (name) VALUES (?)', [file]);
        });
        
        console.log(`Migration ${file} executed successfully.`);
      }
    }
  }
}
