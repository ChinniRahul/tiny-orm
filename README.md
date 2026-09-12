# TinyORM

A Lightweight, Type-Safe TypeScript ORM.

This is a complete frontend and backend project demonstrating a custom-built TypeScript ORM connected to a React UI (Playground).

## Features
- **Type-Safe Models:** Infers TypeScript types from schema definition.
- **SQL Query Builder:** Full support for `WHERE`, `AND`, `OR`, `ORDER BY`, `LIMIT`.
- **Transactions:** Safely run multiple queries in a single SQLite transaction.
- **Migrations System:** Programmatic migration tracking.
- **SQL Injection Protection:** Fully parameterized queries using `better-sqlite3`.
- **Query Logging:** Built-in SQL logger with execution duration.

## Architecture
- **packages/tinyorm**: The core ORM engine.
- **server**: A Node.js + Fastify API that exposes the database to the playground safely.
- **apps/playground**: A React + Vite frontend that allows executing queries in a Monaco editor.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Build the Project**
   ```bash
   npm run build
   ```
3. **Seed the Database**
   ```bash
   npm run seed --workspace server
   ```
4. **Start the API Server**
   ```bash
   npm run start --workspace server
   ```
5. **Start the Frontend**
   ```bash
   npm run dev --workspace playground
   ```
