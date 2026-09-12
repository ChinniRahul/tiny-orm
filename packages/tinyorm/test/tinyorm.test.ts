import { describe, it, expect, beforeEach } from 'vitest';
import { TinyORM } from '../src/database';
import { Model } from '../src/models';
import { QueryBuilder } from '../src/query/builder';
import { SchemaDefinition } from '../src/schema/types';
import { MigrationRunner } from '../src/migrations';

describe('TinyORM', () => {
  const testSchema = {
    users: {
      tableName: 'users',
      fields: {
        id: { type: 'number', primaryKey: true, autoIncrement: true },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    },
    posts: {
      tableName: 'posts',
      fields: {
        id: { type: 'number', primaryKey: true, autoIncrement: true },
        title: { type: 'string' },
        userId: { type: 'number' }
      },
      relations: {
        author: {
          type: 'belongsTo',
          model: 'users',
          foreignKey: 'userId'
        }
      }
    }
  } satisfies SchemaDefinition;

  let db: TinyORM<typeof testSchema>;
  let userModel: Model<any, typeof testSchema>;
  let postModel: Model<any, typeof testSchema>;

  beforeEach(() => {
    // In-memory sqlite database
    db = new TinyORM(':memory:', testSchema);
    userModel = new Model(db, 'users', testSchema.users);
    postModel = new Model(db, 'posts', testSchema.posts);

    // Create tables
    db.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);
    db.execute(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        userId INTEGER NOT NULL
      )
    `);
  });

  describe('QueryBuilder', () => {
    it('builds a simple where clause', () => {
      const { sql, params } = QueryBuilder.buildWhere({ name: 'Alice' });
      expect(sql).toBe('WHERE name = ?');
      expect(params).toEqual(['Alice']);
    });

    it('builds a where clause with operators', () => {
      const { sql, params } = QueryBuilder.buildWhere({ age: { gt: 20, lte: 30 } });
      expect(sql).toBe('WHERE age > ? AND age <= ?');
      expect(params).toEqual([20, 30]);
    });
    
    it('builds OR conditions', () => {
      const { sql, params } = QueryBuilder.buildWhere({ OR: [{ name: 'Alice' }, { name: 'Bob' }] });
      expect(sql).toBe('WHERE (name = ? OR name = ?)');
      expect(params).toEqual(['Alice', 'Bob']);
    });
    
    it('builds orderBy', () => {
      const sql = QueryBuilder.buildOrderBy({ name: 'asc', id: 'desc' });
      expect(sql).toBe('ORDER BY name ASC, id DESC');
    });
  });

  describe('CRUD Operations', () => {
    it('creates and finds a record', async () => {
      const user = await userModel.create({ data: { name: 'Alice', email: 'alice@example.com' } });
      expect(user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
      expect(user.id).toBeTypeOf('number');

      const found = await userModel.findUnique({ where: { id: user.id } });
      expect(found).toMatchObject(user);
    });

    it('creates multiple records and uses count', async () => {
      await userModel.createMany({
        data: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' }
        ]
      });

      const count = await userModel.count();
      expect(count).toBe(2);

      const countBob = await userModel.count({ where: { name: 'Bob' } });
      expect(countBob).toBe(1);
    });

    it('updates a record', async () => {
      const user = await userModel.create({ data: { name: 'Alice', email: 'alice@example.com' } });
      const updated = await userModel.update({
        where: { id: user.id },
        data: { name: 'Alice Updated' }
      });

      expect(updated).toBeTruthy();
      expect(updated!.name).toBe('Alice Updated');
    });

    it('deletes a record', async () => {
      const user = await userModel.create({ data: { name: 'Alice', email: 'alice@example.com' } });
      await userModel.delete({ where: { id: user.id } });

      const found = await userModel.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });
  });

  describe('Relations', () => {
    it('fetches belongsTo relations using include', async () => {
      const user = await userModel.create({ data: { name: 'Alice', email: 'alice@test.com' } });
      const post = await postModel.create({ data: { title: 'First Post', userId: user.id } });

      const postWithAuthor = await postModel.findUnique({
        where: { id: post.id },
        include: { author: true }
      });

      expect(postWithAuthor).toBeTruthy();
      expect((postWithAuthor as any).author).toMatchObject({ id: user.id, name: 'Alice' });
    });
  });

  describe('Transactions', () => {
    it('commits successful transactions', async () => {
      await db.transaction(async (tx) => {
        const txUserModel = new Model(tx as any, 'users', testSchema.users);
        await txUserModel.create({ data: { name: 'TxUser', email: 'tx@test.com' } });
      });

      const user = await userModel.findFirst({ where: { name: 'TxUser' } });
      expect(user).toBeTruthy();
    });

    it('rolls back failed transactions', async () => {
      try {
        await db.transaction(async (tx) => {
          const txUserModel = new Model(tx as any, 'users', testSchema.users);
          await txUserModel.create({ data: { name: 'FailUser', email: 'fail@test.com' } });
          throw new Error('Abort!');
        });
      } catch (e) {
        // Ignored
      }

      const user = await userModel.findFirst({ where: { name: 'FailUser' } });
      expect(user).toBeNull();
    });
  });

  describe('Migrations', () => {
    it('can initialize migrations table', async () => {
      const runner = new MigrationRunner(db, './non_existent_path');
      await runner.setup();
      
      const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='__tinyorm_migrations'");
      expect(tables.length).toBe(1);
    });
  });
});
