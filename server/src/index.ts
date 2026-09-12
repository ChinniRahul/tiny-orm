import Fastify from 'fastify';
import cors from '@fastify/cors';
import { TinyORM, createClient, SchemaDefinition } from 'tinyorm';
import { MigrationRunner } from 'tinyorm/dist/migrations';
import * as path from 'path';

const appSchema = {
  user: {
    tableName: 'users',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      name: { type: 'string' },
      email: { type: 'string' },
      age: { type: 'number' },
      createdAt: { type: 'date', default: 'CURRENT_TIMESTAMP' }
    },
    relations: {
      posts: {
        type: 'hasMany',
        model: 'post',
        foreignKey: 'userId'
      }
    }
  },
  post: {
    tableName: 'posts',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      title: { type: 'string' },
      userId: { type: 'number' }
    },
    relations: {
      author: {
        type: 'belongsTo',
        model: 'user',
        foreignKey: 'userId'
      },
      comments: {
        type: 'hasMany',
        model: 'comment',
        foreignKey: 'postId'
      }
    }
  },
  comment: {
    tableName: 'comments',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      text: { type: 'string' },
      postId: { type: 'number' }
    },
    relations: {
      post: {
        type: 'belongsTo',
        model: 'post',
        foreignKey: 'postId'
      }
    }
  }
} satisfies SchemaDefinition;

// In-memory logs for performance tab
const queryLogs: Array<{ sql: string; params: any[]; duration: number; timestamp: Date }> = [];

// Start the database
const db = createClient('./demo.sqlite', appSchema, {
  logger: (sql, params, duration) => {
    console.log(`[QUERY] ${sql}`);
    console.log(`Parameters: ${JSON.stringify(params)}`);
    console.log(`Execution: ${duration.toFixed(2)} ms\n`);
    queryLogs.push({ sql, params, duration, timestamp: new Date() });
    // Keep only last 100 queries
    if (queryLogs.length > 100) queryLogs.shift();
  }
});

const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(cors, {
  origin: true
});

fastify.get('/api/schema', async (request, reply) => {
  return appSchema;
});

fastify.get('/api/tables', async (request, reply) => {
  const tables = db.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  return tables;
});

fastify.get('/api/tables/:table', async (request, reply) => {
  const { table } = request.params as any;
  const rows = db.db.query(`SELECT * FROM ${table} LIMIT 50`);
  return rows;
});

fastify.get('/api/stats', async (request, reply) => {
  const tables = db.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'") as {name: string}[];
  const stats = tables.map(t => {
    const rowCount = db.db.get(`SELECT COUNT(*) as count FROM ${t.name}`).count;
    return { table: t.name, rows: rowCount };
  });
  return stats;
});

fastify.get('/api/migrations', async (request, reply) => {
  try {
    const runner = new MigrationRunner(db.db, path.join(__dirname, '../migrations'));
    const executed = await runner.getExecutedMigrations();
    return { executed };
  } catch (e) {
    return { executed: [] };
  }
});

fastify.get('/api/performance', async (request, reply) => {
  return queryLogs;
});

// Safe query evaluation
fastify.post('/api/query', async (request, reply) => {
  const { model, action, args } = request.body as any;
  
  if (!(model in appSchema)) {
    return reply.status(400).send({ error: `Unknown model: ${model}` });
  }

  const modelInstance = (db as any)[model];
  if (!modelInstance || typeof modelInstance[action] !== 'function') {
    return reply.status(400).send({ error: `Unknown action: ${action} on model ${model}` });
  }

  try {
    const start = performance.now();
    const result = await modelInstance[action](args);
    const duration = performance.now() - start;

    return {
      result,
      duration
    };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

const port = parseInt(process.env.PORT || '3001', 10);
fastify.listen({ port, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
  
  // Run migrations on startup
  console.log('Running migrations...');
  const runner = new MigrationRunner(db.db, path.join(__dirname, '../migrations'));
  await runner.runMigrations();
});
