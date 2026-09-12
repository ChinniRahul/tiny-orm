import { createClient, SchemaDefinition } from 'tinyorm';

const appSchema = {
  user: {
    tableName: 'users',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      name: { type: 'string' },
      email: { type: 'string' },
      age: { type: 'number' },
      createdAt: { type: 'date' }
    }
  },
  post: {
    tableName: 'posts',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      title: { type: 'string' },
      userId: { type: 'number' }
    }
  },
  comment: {
    tableName: 'comments',
    fields: {
      id: { type: 'number', primaryKey: true, autoIncrement: true },
      text: { type: 'string' },
      postId: { type: 'number' }
    }
  }
} satisfies SchemaDefinition;

const db = createClient('./demo.sqlite', appSchema);

async function seed() {
  console.log('Dropping old tables...');
  db.db.execute('DROP TABLE IF EXISTS comments');
  db.db.execute('DROP TABLE IF EXISTS posts');
  db.db.execute('DROP TABLE IF EXISTS users');
  db.db.execute('DROP TABLE IF EXISTS __tinyorm_migrations');

  console.log('Running migrations...');
  const { MigrationRunner } = require('tinyorm/dist/migrations');
  const path = require('path');
  const runner = new MigrationRunner(db.db, path.join(__dirname, '../migrations'));
  await runner.runMigrations();

  console.log('Seeding data...');
  await db.user.createMany({
    data: [
      { name: 'Rahul', email: 'rahul@example.com', age: 22 },
      { name: 'Arjun', email: 'arjun@example.com', age: 25 },
      { name: 'Priya', email: 'priya@example.com', age: 20 },
      { name: 'Neha', email: 'neha@example.com', age: 28 },
    ]
  });

  const users = await db.user.findMany();
  
  await db.post.createMany({
    data: [
      { title: 'Hello World', userId: users[0].id },
      { title: 'TinyORM is great', userId: users[0].id },
      { title: 'TypeScript ORMs', userId: users[1].id },
    ]
  });

  const posts = await db.post.findMany();

  await db.comment.createMany({
    data: [
      { text: 'Great post!', postId: posts[0].id },
      { text: 'I agree', postId: posts[1].id },
      { text: 'Nice', postId: posts[2].id },
    ]
  });

  console.log('Seeding complete!');
}

seed().catch(console.error);
